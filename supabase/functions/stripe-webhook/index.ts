import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper for structured logging
const log = (event: string, details?: Record<string, unknown>) => {
  console.log(`[STRIPE-WEBHOOK] ${event}`, details ? JSON.stringify(details) : "");
};

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin: AnySupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    // SECURITY: Require webhook signature verification
    if (!webhookSecret) {
      log("ERROR", { message: "STRIPE_WEBHOOK_SECRET not configured" });
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!signature) {
      log("ERROR", { message: "Missing stripe-signature header" });
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      log("ERROR", { message: "Signature verification failed", error: String(err) });
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log("Event received", { type: event.type, id: event.id });

    // Route to appropriate handler
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(event, supabaseAdmin, corsHeaders);

      case "payment_intent.succeeded":
        return await handlePaymentIntentSucceeded(event, supabaseAdmin, corsHeaders);

      case "payment_intent.payment_failed":
        return await handlePaymentIntentFailed(event, supabaseAdmin, corsHeaders);

      case "charge.refunded":
        return await handleChargeRefunded(event, supabaseAdmin, corsHeaders);

      default:
        log("Unhandled event type", { type: event.type });
        return new Response(
          JSON.stringify({ received: true, handled: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    }
  } catch (error) {
    log("ERROR", { message: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/**
 * Detect customer type (B2C/B2B) from metadata and shipping address
 */
function detectCustomerType(
  metadata: Record<string, string>,
  shippingAddress: Record<string, string>
): { customerType: "b2c" | "b2b"; buyerTaxId: string | null; buyerLegalName: string | null } {
  // Check metadata first (preferred)
  const buyerTaxId = metadata.buyer_tax_id || shippingAddress.tax_id || null;
  const buyerLegalName = metadata.buyer_legal_name || shippingAddress.legal_name || null;
  
  // B2B if both tax_id and legal_name exist
  const customerType = (buyerTaxId && buyerLegalName) ? "b2b" : "b2c";
  
  log("Customer type detected", { customerType, hasTaxId: !!buyerTaxId, hasLegalName: !!buyerLegalName });
  
  return { customerType, buyerTaxId, buyerLegalName };
}

/**
 * Get referral settings from database
 */
async function getReferralSettings(supabase: AnySupabaseClient): Promise<{
  rewardPercentage: number;
  capEur: number;
  pendingDays: number;
}> {
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("key, value");

  const settingsMap: Record<string, number> = {};
  for (const s of settings || []) {
    settingsMap[s.key] = typeof s.value === 'number' ? s.value : parseFloat(s.value);
  }

  return {
    rewardPercentage: settingsMap.REWARD_PERCENTAGE || 5,
    capEur: settingsMap.CAP_EUR || 100,
    pendingDays: settingsMap.REWARD_PENDING_DAYS || 7,
  };
}

/**
 * Process referral reward after payment success
 */
async function processReferralReward(
  supabase: AnySupabaseClient,
  orderId: string,
  userId: string,
  referralCodeUsed: string | null,
  productSubtotalEur: number
): Promise<{ rewardCreated: boolean; rewardAmount: number | null; error?: string }> {
  if (!referralCodeUsed) {
    log("No referral code used", { orderId });
    return { rewardCreated: false, rewardAmount: null };
  }

  // 1. Find referrer by code
  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("user_id")
    .eq("code", referralCodeUsed)
    .maybeSingle();

  if (!referralCode) {
    log("Invalid referral code", { code: referralCodeUsed });
    return { rewardCreated: false, rewardAmount: null, error: "Invalid referral code" };
  }

  const referrerUserId = referralCode.user_id;

  // 2. Anti-fraud: Block self-referrals
  if (referrerUserId === userId) {
    log("Self-referral blocked", { userId, referralCodeUsed });
    return { rewardCreated: false, rewardAmount: null, error: "Self-referral not allowed" };
  }

  // 3. Check if user is "new" (no prior paid orders)
  const { data: priorOrders, error: priorOrdersError } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["paid", "shipped", "delivered"])
    .neq("id", orderId)
    .limit(1);

  if (priorOrdersError) {
    log("Error checking prior orders", { error: priorOrdersError.message });
    return { rewardCreated: false, rewardAmount: null, error: "Database error" };
  }

  if (priorOrders && priorOrders.length > 0) {
    log("User is not new - has prior paid orders", { userId, priorOrderCount: priorOrders.length });
    return { rewardCreated: false, rewardAmount: null, error: "Not a new user" };
  }

  // 4. Check if reward already exists for this order (idempotency)
  const { data: existingReward } = await supabase
    .from("referral_rewards")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingReward) {
    log("Reward already exists for order", { orderId, rewardId: existingReward.id });
    return { rewardCreated: false, rewardAmount: null, error: "Reward already exists" };
  }

  // 5. Get referral settings
  const settings = await getReferralSettings(supabase);

  // 6. Calculate reward (only on product subtotal, excluding shipping)
  const rewardBruto = productSubtotalEur * (settings.rewardPercentage / 100);
  const rewardFinal = Math.min(rewardBruto, settings.capEur);
  const capApplied = rewardBruto > settings.capEur;

  // 7. Calculate maturity date
  const maturesAt = new Date();
  maturesAt.setDate(maturesAt.getDate() + settings.pendingDays);

  // 8. Create reward record
  const { data: reward, error: rewardError } = await supabase
    .from("referral_rewards")
    .insert({
      referrer_user_id: referrerUserId,
      referred_user_id: userId,
      order_id: orderId,
      status: "pending",
      product_subtotal: productSubtotalEur,
      reward_percentage: settings.rewardPercentage,
      reward_amount: rewardFinal,
      cap_applied: capApplied,
      currency: "EUR",
      payment_confirmed_at: new Date().toISOString(),
      matures_at: maturesAt.toISOString(),
    })
    .select()
    .single();

  if (rewardError) {
    log("Error creating reward", { error: rewardError.message });
    return { rewardCreated: false, rewardAmount: null, error: rewardError.message };
  }

  // 9. Update referrer's pending balance
  const { data: walletData } = await supabase
    .from("wallets")
    .select("pending_balance")
    .eq("user_id", referrerUserId)
    .single();

  if (walletData) {
    await supabase
      .from("wallets")
      .update({
        pending_balance: (walletData.pending_balance || 0) + rewardFinal,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", referrerUserId);
  }

  // 10. Update referred user's profile
  await supabase
    .from("profiles")
    .update({
      referred_by_user_id: referrerUserId,
      referral_code_used: referralCodeUsed,
    })
    .eq("user_id", userId);

  log("Referral reward created", {
    rewardId: reward.id,
    referrerUserId,
    referredUserId: userId,
    orderId,
    rewardAmount: rewardFinal,
    capApplied,
    maturesAt: maturesAt.toISOString(),
  });

  return { rewardCreated: true, rewardAmount: rewardFinal };
}

/**
 * Reverse referral reward on refund
 */
async function reverseReferralReward(
  supabase: AnySupabaseClient,
  orderId: string,
  isFullRefund: boolean,
  newProductSubtotalEur?: number
): Promise<{ reversed: boolean; reversedAmount: number | null }> {
  // Find reward for this order
  const { data: reward } = await supabase
    .from("referral_rewards")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!reward) {
    log("No referral reward found for order", { orderId });
    return { reversed: false, reversedAmount: null };
  }

  if (reward.status === "reversed") {
    log("Reward already reversed", { rewardId: reward.id });
    return { reversed: false, reversedAmount: null };
  }

  const settings = await getReferralSettings(supabase);
  let amountToReverse = reward.reward_amount;
  let newRewardAmount = 0;

  if (!isFullRefund && newProductSubtotalEur !== undefined) {
    // Partial refund: recalculate new reward
    const newRewardBruto = newProductSubtotalEur * (settings.rewardPercentage / 100);
    newRewardAmount = Math.min(newRewardBruto, settings.capEur);
    amountToReverse = reward.reward_amount - newRewardAmount;

    if (amountToReverse <= 0) {
      log("No reward reversal needed after recalculation", { orderId, newRewardAmount });
      return { reversed: false, reversedAmount: null };
    }
  }

  // Get referrer's wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, available_balance, pending_balance")
    .eq("user_id", reward.referrer_user_id)
    .single();

  if (!wallet) {
    log("Wallet not found for referrer", { referrerUserId: reward.referrer_user_id });
    return { reversed: false, reversedAmount: null };
  }

  // Create reversal transaction
  const { data: transaction } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: reward.referrer_user_id,
      wallet_id: wallet.id,
      type: "reversal",
      source: "referral_reward",
      amount: -amountToReverse,
      currency: "EUR",
      reference_id: reward.id,
      description: isFullRefund ? "Full refund reversal" : "Partial refund reversal",
    })
    .select()
    .single();

  // Update wallet balance
  if (reward.status === "available") {
    // Deduct from available balance
    await supabase
      .from("wallets")
      .update({
        available_balance: Math.max(0, wallet.available_balance - amountToReverse),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", reward.referrer_user_id);
  } else if (reward.status === "pending") {
    // Deduct from pending balance
    await supabase
      .from("wallets")
      .update({
        pending_balance: Math.max(0, wallet.pending_balance - amountToReverse),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", reward.referrer_user_id);
  }

  // Update reward status
  if (isFullRefund) {
    await supabase
      .from("referral_rewards")
      .update({
        status: "reversed",
        reversed_at: new Date().toISOString(),
        reversal_reason: "Full refund",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reward.id);
  } else {
    await supabase
      .from("referral_rewards")
      .update({
        reward_amount: newRewardAmount,
        product_subtotal: newProductSubtotalEur,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reward.id);
  }

  log("Referral reward reversed", {
    rewardId: reward.id,
    amountReversed: amountToReverse,
    isFullRefund,
    newRewardAmount: isFullRefund ? 0 : newRewardAmount,
  });

  return { reversed: true, reversedAmount: amountToReverse };
}

/**
 * Handle checkout.session.completed event
 * This is the primary event for Embedded Checkout flow
 */
async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const session = event.data.object as Stripe.Checkout.Session;
  log("Processing checkout.session.completed", { sessionId: session.id });

  const paymentIntentId = session.payment_intent as string;

  // Idempotency check: skip if order already exists for this payment intent
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existingOrder) {
    log("Order already exists for payment intent", { paymentIntentId, orderId: existingOrder.id });
    return new Response(
      JSON.stringify({ received: true, skipped: true, reason: "order_exists" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const subtotalCents = parseInt(metadata.subtotal_cents || "0");
  const shippingCents = parseInt(metadata.shipping_cents || "0");
  const walletAmountCents = parseInt(metadata.wallet_amount_cents || "0");
  const referralCodeUsed = metadata.referral_code_used || null;

  // Parse items from metadata
  let items: Array<{ id: string; qty: number; price: number; name: string; image?: string }> = [];
  try {
    items = JSON.parse(metadata.items_json || "[]");
  } catch (e) {
    log("Failed to parse items_json", { error: String(e) });
  }

  // Get shipping details
  const shippingDetails = session.shipping_details || session.customer_details;
  const shippingAddress: Record<string, string> = {
    email: session.customer_details?.email || "",
    full_name: shippingDetails?.name || "",
    phone: session.customer_details?.phone || "",
    street: shippingDetails?.address?.line1 || "",
    apartment: shippingDetails?.address?.line2 || "",
    postal_code: shippingDetails?.address?.postal_code || "",
    city: shippingDetails?.address?.city || "",
    province: shippingDetails?.address?.state || "",
    country: shippingDetails?.address?.country || "",
    // B2B fields from metadata
    tax_id: metadata.buyer_tax_id || "",
    legal_name: metadata.buyer_legal_name || "",
  };

  // Detect B2C vs B2B
  const { customerType, buyerTaxId, buyerLegalName } = detectCustomerType(metadata, shippingAddress);

  // Generate order number
  const { data: orderNumberData } = await supabase.rpc("generate_order_number");
  const orderNumber = orderNumberData || `FP-${Date.now()}`;

  let orderId: string | null = null;
  let plantsCreated = 0;
  let invoiceId: string | null = null;
  let referralRewardResult = { rewardCreated: false, rewardAmount: null as number | null };

  // Create order for authenticated users
  if (userId && userId !== "guest") {
    // Calculate total with wallet discount
    const totalCents = subtotalCents + shippingCents;
    const totalAmountEur = totalCents / 100;
    const walletAmountEur = walletAmountCents / 100;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: "paid",
        total_amount: totalAmountEur,
        shipping_address: shippingAddress,
        notes: `Stripe session: ${session.id}`,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: session.customer as string || null,
        stripe_checkout_session_id: session.id,
        customer_type: customerType,
        referrer_user_id: null, // Will be set by referral processing
        referral_code_used: referralCodeUsed,
        wallet_amount_used: walletAmountEur,
      })
      .select()
      .single();

    if (orderError) {
      log("Failed to create order", { error: orderError.message });
      throw orderError;
    }

    log("Order created", { orderId: order.id, orderNumber, customerType, walletUsed: walletAmountEur });
    orderId = order.id;

    // Deduct wallet balance if used
    if (walletAmountEur > 0) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, available_balance")
        .eq("user_id", userId)
        .single();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            available_balance: Math.max(0, wallet.available_balance - walletAmountEur),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabase
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            wallet_id: wallet.id,
            type: "debit",
            source: "order_discount",
            amount: -walletAmountEur,
            currency: "EUR",
            reference_id: order.id,
            description: `Order ${orderNumber} discount`,
          });

        log("Wallet balance deducted", { userId, amount: walletAmountEur });
      }
    }

    // Create order items
    for (const item of items) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price / 100,
        product_image: item.image || null,
      });
    }

    // Process referral reward
    const productSubtotalEur = subtotalCents / 100;
    referralRewardResult = await processReferralReward(
      supabase,
      order.id,
      userId,
      referralCodeUsed,
      productSubtotalEur
    );

    // Update order with referrer if reward was created
    if (referralRewardResult.rewardCreated) {
      const { data: referralCode } = await supabase
        .from("referral_codes")
        .select("user_id")
        .eq("code", referralCodeUsed)
        .maybeSingle();

      if (referralCode) {
        await supabase
          .from("orders")
          .update({ referrer_user_id: referralCode.user_id })
          .eq("id", order.id);
      }
    }

    // Create Spanish invoice (B2C or B2B series based on customer_type)
    try {
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_spanish_invoice_from_order",
        {
          p_order_id: order.id,
          p_invoice_type: "standard",
          p_rectifies_invoice_id: null,
          p_rectification_reason: null,
        }
      );

      if (invoiceError) {
        log("Error creating Spanish invoice", { error: invoiceError.message });
      } else {
        invoiceId = invoiceData;
        log("Spanish invoice created", { invoiceId, customerType });
      }
    } catch (err) {
      log("Error creating Spanish invoice", { error: String(err) });
    }

    // Create owned plants from order
    try {
      const { data: plantsCount } = await supabase.rpc("create_owned_plants_from_order", {
        p_order_id: order.id,
        p_user_id: userId,
      });
      plantsCreated = plantsCount || 0;
      log("Created owned plants", { count: plantsCreated });
    } catch (err) {
      log("Error creating owned plants", { error: String(err) });
    }

    // Match wishlist items
    try {
      const { data: wishlistMatched } = await supabase.rpc("match_wishlist_to_order", {
        p_order_id: order.id,
        p_user_id: userId,
      });
      if (wishlistMatched && wishlistMatched > 0) {
        log("Matched wishlist items", { count: wishlistMatched });
      }
    } catch (err) {
      log("Error matching wishlist", { error: String(err) });
    }
  } else {
    // Guest order - log for manual processing
    log("Guest order completed", {
      sessionId: session.id,
      email: shippingAddress.email,
      total: subtotalCents / 100,
      customerType,
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      orderId,
      orderNumber,
      invoiceId,
      customerType,
      plantsCreated,
      isGuest: !userId || userId === "guest",
      referralRewardCreated: referralRewardResult.rewardCreated,
      referralRewardAmount: referralRewardResult.rewardAmount,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

/**
 * Handle payment_intent.succeeded event
 * Secondary confirmation - ensures order is marked as paid
 */
async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  log("Processing payment_intent.succeeded", { paymentIntentId: paymentIntent.id });

  // Check if order exists and update if needed
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status, stripe_payment_intent_id, invoice_id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (existingOrder) {
    // Update to paid if not already
    if (existingOrder.status !== "paid") {
      await supabase
        .from("orders")
        .update({
          status: "paid",
          stripe_charge_id: paymentIntent.latest_charge as string || null,
        })
        .eq("id", existingOrder.id);

      log("Order updated to paid", { orderId: existingOrder.id });

      // Create invoice if doesn't exist yet
      if (!existingOrder.invoice_id) {
        try {
          const { data: invoiceId } = await supabase.rpc(
            "create_spanish_invoice_from_order",
            {
              p_order_id: existingOrder.id,
              p_invoice_type: "standard",
              p_rectifies_invoice_id: null,
              p_rectification_reason: null,
            }
          );
          log("Spanish invoice created on payment_intent.succeeded", { invoiceId });
        } catch (err) {
          log("Error creating invoice", { error: String(err) });
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, orderId: existingOrder.id, action: "updated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // No order found - might be created by checkout.session.completed later
  log("No order found for payment intent", { paymentIntentId: paymentIntent.id });

  return new Response(
    JSON.stringify({ received: true, action: "no_order_found" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

/**
 * Handle payment_intent.payment_failed event
 * Mark order as failed - NO invoice is created, NO referral reward
 */
async function handlePaymentIntentFailed(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  log("Processing payment_intent.payment_failed", { paymentIntentId: paymentIntent.id });

  // Check if order exists and update
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (existingOrder && existingOrder.status !== "failed") {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", existingOrder.id);

    log("Order marked as failed", { orderId: existingOrder.id });

    return new Response(
      JSON.stringify({ received: true, orderId: existingOrder.id, action: "marked_failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  return new Response(
    JSON.stringify({ received: true, action: "no_action_needed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

/**
 * Handle charge.refunded event
 * Create RECTIFICATIVA invoice, update order/invoice status, and reverse referral reward
 */
async function handleChargeRefunded(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const charge = event.data.object as Stripe.Charge;
  log("Processing charge.refunded", { chargeId: charge.id, paymentIntentId: charge.payment_intent });

  const paymentIntentId = charge.payment_intent as string;
  const amountRefunded = charge.amount_refunded / 100; // Convert to euros
  const isFullRefund = charge.refunded; // true if fully refunded

  // Find order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("id, total_amount, invoice_id, wallet_amount_used")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!order) {
    log("No order found for refund", { paymentIntentId });
    return new Response(
      JSON.stringify({ received: true, action: "no_order_found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // Determine refund status
  const newStatus = isFullRefund ? "refunded" : "partially_refunded";

  // Get the latest refund ID
  const refunds = charge.refunds?.data || [];
  const latestRefund = refunds[0];

  // Update order
  await supabase
    .from("orders")
    .update({
      status: newStatus,
      refund_id: latestRefund?.id || null,
      refund_amount: amountRefunded,
    })
    .eq("id", order.id);

  log("Order refund status updated", { orderId: order.id, status: newStatus, refundAmount: amountRefunded });

  // Reverse referral reward
  // Calculate new product subtotal if partial refund
  const newProductSubtotal = isFullRefund ? 0 : (order.total_amount - amountRefunded - (order.wallet_amount_used || 0));
  const referralReverseResult = await reverseReferralReward(
    supabase,
    order.id,
    isFullRefund,
    newProductSubtotal > 0 ? newProductSubtotal : undefined
  );

  // Update original invoice status
  if (order.invoice_id) {
    const invoiceStatus = isFullRefund ? "refunded" : "partially_refunded";

    await supabase
      .from("invoices")
      .update({
        status: invoiceStatus,
        refund_amount: amountRefunded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.invoice_id);

    log("Original invoice status updated", { invoiceId: order.invoice_id, status: invoiceStatus });

    // Create RECTIFICATIVA invoice
    try {
      const rectificationReason = isFullRefund 
        ? "Devolución total del pedido" 
        : `Devolución parcial: ${amountRefunded.toFixed(2)} EUR`;

      const { data: rectificativaId, error: rectError } = await supabase.rpc(
        "create_spanish_invoice_from_order",
        {
          p_order_id: order.id,
          p_invoice_type: "rectificativa",
          p_rectifies_invoice_id: order.invoice_id,
          p_rectification_reason: rectificationReason,
        }
      );

      if (rectError) {
        log("Error creating rectificativa", { error: rectError.message });
      } else {
        log("Rectificativa created", { 
          rectificativaId, 
          rectifiesInvoice: order.invoice_id,
          reason: rectificationReason 
        });
      }
    } catch (err) {
      log("Error creating rectificativa", { error: String(err) });
    }
  }

  return new Response(
    JSON.stringify({
      received: true,
      orderId: order.id,
      action: newStatus,
      refundAmount: amountRefunded,
      rectificativaCreated: !!order.invoice_id,
      referralReversed: referralReverseResult.reversed,
      referralReversedAmount: referralReverseResult.reversedAmount,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
