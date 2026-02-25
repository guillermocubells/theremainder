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

/**
 * Emit a domain event to the audit_logs table for frontend consumption.
 * These events power real-time notifications and order status surfaces.
 */
async function emitDomainEvent(
  supabase: AnySupabaseClient,
  params: {
    event_type: string;
    user_id: string;
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("audit_logs").insert({
      action: params.event_type,
      actor_id: null,
      actor_role: "system",
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      new_data: params.metadata || {},
      metadata: { target_user_id: params.user_id },
    });
    log("Domain event emitted", { event: params.event_type, entity: params.entity_id });
  } catch (err) {
    log("Error emitting domain event (non-blocking)", { error: String(err) });
  }
}

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

    // --- Idempotency: reject duplicate events ---
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      log("Duplicate event skipped", { stripe_event_id: event.id });
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build redacted payload snapshot (strip sensitive fields)
    const redactedPayload = {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
      object_id: (event.data?.object as Record<string, unknown>)?.id ?? null,
      object_type: (event.data?.object as Record<string, unknown>)?.object ?? null,
    };

    let processingResult = "success";
    let errorMessage: string | null = null;

    try {
      // Route to appropriate handler
      let response: Response;
      switch (event.type) {
        case "checkout.session.completed":
          response = await handleCheckoutCompleted(event, supabaseAdmin, corsHeaders);
          break;

        case "payment_intent.succeeded":
          response = await handlePaymentIntentSucceeded(event, supabaseAdmin, corsHeaders);
          break;

        case "payment_intent.payment_failed":
          response = await handlePaymentIntentFailed(event, supabaseAdmin, corsHeaders);
          break;

        case "charge.refunded":
          response = await handleChargeRefunded(event, supabaseAdmin, corsHeaders);
          break;

        case "checkout.session.expired":
          response = await handleCheckoutSessionExpired(event, supabaseAdmin, corsHeaders);
          break;

          log("Unhandled event type", { type: event.type });
          response = new Response(
            JSON.stringify({ received: true, handled: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
          break;
      }

      if (!response.ok) {
        processingResult = "error";
        errorMessage = `HTTP ${response.status}`;
      }

      // Record event in store
      await supabaseAdmin.from("webhook_events").insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload_snapshot: redactedPayload,
        processing_result: processingResult,
        error_message: errorMessage,
      });

      return response;
    } catch (handlerError) {
      // Record failed event
      await supabaseAdmin.from("webhook_events").insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload_snapshot: redactedPayload,
        processing_result: "error",
        error_message: handlerError instanceof Error ? handlerError.message : String(handlerError),
      });
      throw handlerError;
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
 * Check for fraud patterns and create flags
 */
async function checkFraudPatterns(
  supabase: AnySupabaseClient,
  referrerUserId: string,
  referredUserId: string,
  orderId: string,
  clientIp: string | null,
  userAgent: string | null
): Promise<{ isBlocked: boolean; flags: Array<{ type: string; severity: string; message: string }> }> {
  const flags: Array<{ type: string; severity: string; message: string }> = [];
  let isBlocked = false;

  // 1. Check self-referral (CRITICAL - blocks reward)
  if (referrerUserId === referredUserId) {
    isBlocked = true;
    flags.push({
      type: 'self_referral',
      severity: 'critical',
      message: 'Self-referral detected'
    });
    
    await supabase.from('fraud_flags').insert({
      user_id: referredUserId,
      referrer_user_id: referrerUserId,
      type: 'self_referral',
      severity: 'critical',
      status: 'pending',
      related_order_id: orderId,
      metadata: { auto_blocked: true }
    });
    
    log("Fraud: Self-referral blocked", { referrerUserId, referredUserId, orderId });
  }

  // 2. Check similar emails (FLAG only, don't block)
  const { data: referrerProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', referrerUserId)
    .single();

  const { data: referredProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', referredUserId)
    .single();

  if (referrerProfile?.email && referredProfile?.email) {
    const referrerEmail = referrerProfile.email.toLowerCase();
    const referredEmail = referredProfile.email.toLowerCase();
    
    // Check exact match or same local part
    const referrerLocal = referrerEmail.split('@')[0];
    const referredLocal = referredEmail.split('@')[0];
    
    if (referrerEmail === referredEmail || referrerLocal === referredLocal) {
      flags.push({
        type: 'similar_email',
        severity: 'medium',
        message: 'Similar or identical emails detected'
      });
      
      await supabase.from('fraud_flags').insert({
        user_id: referredUserId,
        referrer_user_id: referrerUserId,
        type: 'similar_email',
        severity: 'medium',
        status: 'pending',
        related_order_id: orderId,
        metadata: { referrer_email: referrerEmail, referred_email: referredEmail }
      });
      
      log("Fraud flag: Similar emails", { referrerEmail, referredEmail });
    }
  }

  // 3. Check IP patterns (FLAG only)
  if (clientIp) {
    const { data: ipOrders, error: ipError } = await supabase
      .from('orders')
      .select('id')
      .eq('client_ip', clientIp)
      .not('referrer_user_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!ipError && ipOrders && ipOrders.length >= 3) {
      const severity = ipOrders.length >= 5 ? 'high' : 'medium';
      flags.push({
        type: 'ip_match',
        severity,
        message: `Multiple referred orders from same IP: ${ipOrders.length} orders`
      });
      
      await supabase.from('fraud_flags').insert({
        user_id: referredUserId,
        referrer_user_id: referrerUserId,
        type: 'ip_match',
        severity,
        status: 'pending',
        related_order_id: orderId,
        metadata: { ip: clientIp, order_count: ipOrders.length }
      });
      
      log("Fraud flag: Multiple orders from same IP", { clientIp, orderCount: ipOrders.length });
    }
  }

  // 4. Check suspicious amount patterns (multiple capped rewards)
  const { data: cappedRewards } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('referrer_user_id', referrerUserId)
    .eq('cap_applied', true)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (cappedRewards && cappedRewards.length >= 3) {
    flags.push({
      type: 'suspicious_amount_pattern',
      severity: 'medium',
      message: `Multiple capped rewards for referrer: ${cappedRewards.length} times`
    });
    
    await supabase.from('fraud_flags').insert({
      user_id: referredUserId,
      referrer_user_id: referrerUserId,
      type: 'suspicious_amount_pattern',
      severity: 'medium',
      status: 'pending',
      related_order_id: orderId,
      metadata: { capped_count: cappedRewards.length }
    });
    
    log("Fraud flag: Multiple capped rewards", { referrerUserId, cappedCount: cappedRewards.length });
  }

  return { isBlocked, flags };
}

/**
 * Process referral reward after payment success
 */
async function processReferralReward(
  supabase: AnySupabaseClient,
  orderId: string,
  userId: string,
  referralCodeUsed: string | null,
  productSubtotalEur: number,
  clientIp: string | null = null,
  userAgent: string | null = null
): Promise<{ rewardCreated: boolean; rewardAmount: number | null; error?: string; fraudFlags?: Array<{ type: string; severity: string; message: string }> }> {
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

  // 2. Run fraud checks
  const fraudResult = await checkFraudPatterns(
    supabase,
    referrerUserId,
    userId,
    orderId,
    clientIp,
    userAgent
  );

  // 3. If fraud is blocked (critical), don't create reward
  if (fraudResult.isBlocked) {
    log("Referral blocked due to fraud", { orderId, userId, flags: fraudResult.flags });
    return { 
      rewardCreated: false, 
      rewardAmount: null, 
      error: "Blocked by anti-fraud system",
      fraudFlags: fraudResult.flags
    };
  }

  // 4. Check if user is "new" (no prior paid orders)
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

  // 5. Check if reward already exists for this order (idempotency)
  const { data: existingReward } = await supabase
    .from("referral_rewards")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingReward) {
    log("Reward already exists for order", { orderId, rewardId: existingReward.id });
    return { rewardCreated: false, rewardAmount: null, error: "Reward already exists" };
  }

  // 6. Get referral settings
  const settings = await getReferralSettings(supabase);

  // 7. Calculate reward (only on product subtotal, excluding shipping)
  const rewardBruto = productSubtotalEur * (settings.rewardPercentage / 100);
  const rewardFinal = Math.min(rewardBruto, settings.capEur);
  const capApplied = rewardBruto > settings.capEur;

  // 8. Calculate maturity date
  const maturesAt = new Date();
  maturesAt.setDate(maturesAt.getDate() + settings.pendingDays);

  // 9. Create reward record (with fraud info if flags exist)
  const hasFraudFlags = fraudResult.flags.length > 0;
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
      fraud_blocked: false,
      fraud_reason: hasFraudFlags ? `Flags detected: ${fraudResult.flags.map(f => f.type).join(', ')}` : null,
    })
    .select()
    .single();

  if (rewardError) {
    log("Error creating reward", { error: rewardError.message });
    return { rewardCreated: false, rewardAmount: null, error: rewardError.message };
  }

  // 10. Link fraud flags to the reward
  if (hasFraudFlags) {
    await supabase
      .from("fraud_flags")
      .update({ related_reward_id: reward.id })
      .eq("related_order_id", orderId)
      .eq("user_id", userId);
  }

  // 11. Update referrer's pending balance
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

  // 12. Update referred user's profile
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
    hasFraudFlags,
  });

  return { rewardCreated: true, rewardAmount: rewardFinal, fraudFlags: fraudResult.flags };
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
  const reservationSessionId = metadata.reservation_session_id || null;

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

    // Confirm stock reservations (stock already deducted at checkout start)
    if (reservationSessionId) {
      try {
        const { data: confirmedCount } = await supabase.rpc("confirm_reservation_by_session", {
          p_session_id: reservationSessionId,
          p_payment_intent_id: paymentIntentId,
        });
        log("Stock reservations confirmed", { reservationSessionId, confirmedCount });
      } catch (err) {
        log("Error confirming reservations", { error: String(err) });
      }
    }

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

    // Send order confirmation email
    try {
      const customerEmail = shippingAddress.email;
      if (customerEmail) {
        // Get invoice number if available
        let invoiceNumber: string | null = null;
        if (invoiceId) {
          const { data: inv } = await supabase
            .from("invoices")
            .select("invoice_number")
            .eq("id", invoiceId)
            .maybeSingle();
          invoiceNumber = inv?.invoice_number || null;
        }

        const emailItems = items.map(item => ({
          product_name: item.name,
          quantity: item.qty,
          unit_price: item.price / 100,
        }));

        const shippingCostEur = shippingCents / 100;
        const totalAmountEur = (subtotalCents + shippingCents) / 100;

        // Determine language from metadata (default Spanish)
        const lang = metadata.lang || "es";

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            type: "order_confirmed",
            to: customerEmail,
            lang,
            data: {
              order_number: orderNumber,
              invoice_number: invoiceNumber,
              items: emailItems,
              shipping_cost: shippingCostEur,
              total_amount: totalAmountEur,
              shipping_name: shippingAddress.full_name,
              shipping_address: `${shippingAddress.street}${shippingAddress.apartment ? ', ' + shippingAddress.apartment : ''}, ${shippingAddress.postal_code} ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.country}`,
              account_url: "https://theremainder.lovable.app/account",
            },
          }),
        });

        const emailResult = await emailResponse.json();
        log("Order confirmation email sent", { success: emailResult.success, to: customerEmail, lang });
      }
    } catch (err) {
      log("Error sending confirmation email (non-blocking)", { error: String(err) });
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
 * Secondary confirmation - ensures order is marked as paid.
 * Records charge ID, payment method details, and emits domain event.
 */
async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  log("Processing payment_intent.succeeded", {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  });

  const chargeId = paymentIntent.latest_charge as string || null;

  // Check if order exists and update if needed
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status, stripe_payment_intent_id, invoice_id, user_id, order_number")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (existingOrder) {
    const wasNotPaid = existingOrder.status !== "paid" && existingOrder.status !== "shipped" && existingOrder.status !== "delivered";

    if (wasNotPaid) {
      await supabase
        .from("orders")
        .update({
          status: "paid",
          stripe_charge_id: chargeId,
          updated_at: new Date().toISOString(),
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

      // Emit domain event: payment_confirmed
      await emitDomainEvent(supabase, {
        event_type: "payment_confirmed",
        user_id: existingOrder.user_id,
        entity_type: "order",
        entity_id: existingOrder.id,
        metadata: {
          order_number: existingOrder.order_number,
          payment_intent_id: paymentIntent.id,
          charge_id: chargeId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    } else {
      // Already paid — just ensure charge_id is recorded
      if (chargeId) {
        await supabase
          .from("orders")
          .update({ stripe_charge_id: chargeId })
          .eq("id", existingOrder.id);
      }
    }

    return new Response(
      JSON.stringify({ received: true, orderId: existingOrder.id, action: wasNotPaid ? "updated_to_paid" : "already_paid" }),
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
 * Mark order as failed, capture failure codes/messages, release stock,
 * and emit domain event for frontend notifications.
 */
async function handlePaymentIntentFailed(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const lastError = paymentIntent.last_payment_error;

  const failureCode = lastError?.code || paymentIntent.cancellation_reason || "unknown";
  const failureMessage = lastError?.message || "Payment failed";
  const declineCode = lastError?.decline_code || null;
  const paymentMethodType = lastError?.payment_method?.type || null;

  log("Processing payment_intent.payment_failed", {
    paymentIntentId: paymentIntent.id,
    failureCode,
    declineCode,
    failureMessage,
    paymentMethodType,
  });

  // Release any active stock reservations linked to this payment intent
  const { data: activeReservations } = await supabase
    .from("stock_reservations")
    .select("session_id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .eq("status", "active")
    .limit(1);

  if (activeReservations && activeReservations.length > 0) {
    const { data: releasedCount } = await supabase.rpc("release_reservations_by_session", {
      p_session_id: activeReservations[0].session_id,
    });
    log("Released reservations on payment failure", { releasedCount });
  }

  // Check if order exists and update with failure details
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status, user_id, order_number")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (existingOrder && existingOrder.status !== "paid" && existingOrder.status !== "failed") {
    await supabase
      .from("orders")
      .update({
        status: "failed",
        notes: `Payment failed: ${failureCode}${declineCode ? ` (decline: ${declineCode})` : ''} — ${failureMessage}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingOrder.id);

    log("Order marked as failed", { orderId: existingOrder.id, failureCode, declineCode });

    // Determine if retryable
    const nonRetryableCodes = new Set([
      "stolen_card", "lost_card", "card_declined", "fraudulent",
      "pickup_card", "restricted_card", "security_violation",
    ]);
    const isRetryable = !nonRetryableCodes.has(declineCode || "");

    // Emit domain event: payment_failed
    await emitDomainEvent(supabase, {
      event_type: "payment_failed",
      user_id: existingOrder.user_id,
      entity_type: "order",
      entity_id: existingOrder.id,
      metadata: {
        order_number: existingOrder.order_number,
        payment_intent_id: paymentIntent.id,
        failure_code: failureCode,
        decline_code: declineCode,
        failure_message: failureMessage,
        payment_method_type: paymentMethodType,
        is_retryable: isRetryable,
        next_action: isRetryable ? "retry_payment" : "use_different_method",
      },
    });

    return new Response(
      JSON.stringify({
        received: true,
        orderId: existingOrder.id,
        action: "marked_failed",
        failureCode,
        declineCode,
        isRetryable,
      }),
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
 * Create RECTIFICATIVA invoice, update order/invoice status, restock inventory,
 * reverse referral reward, and emit domain event with full status history.
 */
async function handleChargeRefunded(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const charge = event.data.object as Stripe.Charge;
  log("Processing charge.refunded", { chargeId: charge.id, paymentIntentId: charge.payment_intent });

  const paymentIntentId = charge.payment_intent as string;
  const amountRefunded = charge.amount_refunded / 100;
  const isFullRefund = charge.refunded;

  // Find order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("id, total_amount, invoice_id, wallet_amount_used, user_id, order_number")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!order) {
    log("No order found for refund", { paymentIntentId });
    return new Response(
      JSON.stringify({ received: true, action: "no_order_found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  const newStatus = isFullRefund ? "refunded" : "partially_refunded";
  const refunds = charge.refunds?.data || [];
  const latestRefund = refunds[0];
  const now = new Date().toISOString();

  // Update order
  await supabase
    .from("orders")
    .update({
      status: newStatus,
      refund_id: latestRefund?.id || null,
      refund_amount: amountRefunded,
      updated_at: now,
    })
    .eq("id", order.id);

  log("Order refund status updated", { orderId: order.id, status: newStatus, refundAmount: amountRefunded });

  // --- Restock inventory on full refund ---
  let restockedItems = 0;
  if (isFullRefund) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", order.id);

    if (orderItems) {
      for (const item of orderItems) {
        const { error: stockErr } = await supabase.rpc("increment_stock", {
          p_plant_id: item.product_id,
          p_quantity: item.quantity,
        }).maybeSingle();

        if (stockErr) {
          // Fallback: direct update
          const { data: plant } = await supabase
            .from("plants")
            .select("stock_qty")
            .eq("id", item.product_id)
            .maybeSingle();

          if (plant) {
            await supabase
              .from("plants")
              .update({ stock_qty: plant.stock_qty + item.quantity, updated_at: now })
              .eq("id", item.product_id);
          }
        }
        restockedItems += item.quantity;
      }
      log("Inventory restocked", { orderId: order.id, totalUnits: restockedItems });
    }
  }

  // Reverse referral reward
  const newProductSubtotal = isFullRefund ? 0 : (order.total_amount - amountRefunded - (order.wallet_amount_used || 0));
  const referralReverseResult = await reverseReferralReward(
    supabase,
    order.id,
    isFullRefund,
    newProductSubtotal > 0 ? newProductSubtotal : undefined
  );

  // Update original invoice status
  let rectificativaCreated = false;
  if (order.invoice_id) {
    const invoiceStatus = isFullRefund ? "refunded" : "partially_refunded";

    await supabase
      .from("invoices")
      .update({
        status: invoiceStatus,
        refund_amount: amountRefunded,
        updated_at: now,
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
        rectificativaCreated = true;
        log("Rectificativa created", { rectificativaId, reason: rectificationReason });
      }
    } catch (err) {
      log("Error creating rectificativa", { error: String(err) });
    }
  }

  // Emit domain event: order_refunded
  await emitDomainEvent(supabase, {
    event_type: isFullRefund ? "order_refunded" : "order_partially_refunded",
    user_id: order.user_id,
    entity_type: "order",
    entity_id: order.id,
    metadata: {
      order_number: order.order_number,
      refund_amount: amountRefunded,
      is_full_refund: isFullRefund,
      refund_id: latestRefund?.id || null,
      restocked_units: restockedItems,
      rectificativa_created: rectificativaCreated,
      referral_reversed: referralReverseResult.reversed,
      timestamp: now,
      actor: "system",
    },
  });

  return new Response(
    JSON.stringify({
      received: true,
      orderId: order.id,
      action: newStatus,
      refundAmount: amountRefunded,
      restockedItems,
      rectificativaCreated,
      referralReversed: referralReverseResult.reversed,
      referralReversedAmount: referralReverseResult.reversedAmount,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

/**
 * Handle checkout.session.expired event
 * Release stock reservations, mark any pending order as cancelled,
 * and emit domain event.
 */
async function handleCheckoutSessionExpired(
  event: Stripe.Event,
  supabase: AnySupabaseClient,
  corsHeaders: Record<string, string>
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const reservationSessionId = metadata.reservation_session_id || null;
  const now = new Date().toISOString();

  log("Processing checkout.session.expired", {
    sessionId: session.id,
    userId,
    reservationSessionId,
  });

  // Release stock reservations
  let releasedCount = 0;
  if (reservationSessionId) {
    try {
      const { data } = await supabase.rpc("release_reservations_by_session", {
        p_session_id: reservationSessionId,
      });
      releasedCount = data || 0;
      log("Released reservations on session expiry", { releasedCount });
    } catch (err) {
      log("Error releasing reservations", { error: String(err) });
    }
  }

  // Check if a pending order exists for this session and cancel it
  let cancelledOrderId: string | null = null;
  if (session.payment_intent) {
    const paymentIntentId = session.payment_intent as string;
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("id, status, user_id, order_number")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .in("status", ["pending"])
      .maybeSingle();

    if (pendingOrder) {
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          notes: `Checkout session expired at ${now}`,
          updated_at: now,
        })
        .eq("id", pendingOrder.id);

      cancelledOrderId = pendingOrder.id;
      log("Pending order cancelled due to session expiry", { orderId: pendingOrder.id });

      // Emit domain event
      await emitDomainEvent(supabase, {
        event_type: "order_expired",
        user_id: pendingOrder.user_id,
        entity_type: "order",
        entity_id: pendingOrder.id,
        metadata: {
          order_number: pendingOrder.order_number,
          checkout_session_id: session.id,
          reservations_released: releasedCount,
          timestamp: now,
          actor: "system",
        },
      });
    }
  }

  // Emit session-level domain event even if no order existed
  if (!cancelledOrderId && userId && userId !== "guest") {
    await emitDomainEvent(supabase, {
      event_type: "checkout_expired",
      user_id: userId,
      entity_type: "checkout_session",
      entity_id: session.id,
      metadata: {
        reservations_released: releasedCount,
        timestamp: now,
        actor: "system",
      },
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      action: "session_expired",
      cancelledOrderId,
      reservationsReleased: releasedCount,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
