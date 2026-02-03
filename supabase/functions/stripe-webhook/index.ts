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
  const totalCents = subtotalCents + shippingCents;

  // Parse items from metadata
  let items: Array<{ id: string; qty: number; price: number; name: string; image?: string }> = [];
  try {
    items = JSON.parse(metadata.items_json || "[]");
  } catch (e) {
    log("Failed to parse items_json", { error: String(e) });
  }

  // Get shipping details
  const shippingDetails = session.shipping_details || session.customer_details;
  const shippingAddress = {
    email: session.customer_details?.email || "",
    fullName: shippingDetails?.name || "",
    phone: session.customer_details?.phone || "",
    street: shippingDetails?.address?.line1 || "",
    apartment: shippingDetails?.address?.line2 || "",
    postalCode: shippingDetails?.address?.postal_code || "",
    city: shippingDetails?.address?.city || "",
    province: shippingDetails?.address?.state || "",
    country: shippingDetails?.address?.country || "",
  };

  // Generate order number
  const { data: orderNumberData } = await supabase.rpc("generate_order_number");
  const orderNumber = orderNumberData || `FP-${Date.now()}`;

  let orderId: string | null = null;
  let plantsCreated = 0;

  // Create order for authenticated users
  if (userId && userId !== "guest") {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: "paid",
        total_amount: totalCents / 100,
        shipping_address: shippingAddress,
        notes: `Stripe session: ${session.id}`,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: session.customer as string || null,
        stripe_checkout_session_id: session.id,
      })
      .select()
      .single();

    if (orderError) {
      log("Failed to create order", { error: orderError.message });
      throw orderError;
    }

    log("Order created", { orderId: order.id, orderNumber });
    orderId = order.id;

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
      total: totalCents / 100,
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      orderId,
      orderNumber,
      plantsCreated,
      isGuest: !userId || userId === "guest",
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
    .select("id, status, stripe_payment_intent_id")
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
 * Mark order as failed
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
 * Update order and invoice status based on refund amount
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
    .select("id, total_amount, invoice_id")
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

  // Update invoice if exists
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

    log("Invoice status updated", { invoiceId: order.invoice_id, status: invoiceStatus });
  }

  return new Response(
    JSON.stringify({
      received: true,
      orderId: order.id,
      action: newStatus,
      refundAmount: amountRefunded,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
