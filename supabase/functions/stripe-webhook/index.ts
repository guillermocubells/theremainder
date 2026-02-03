import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  // Use service role key for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // SECURITY: Require webhook signature verification
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured - rejecting webhook");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Webhook event received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("Processing completed checkout:", session.id);
      console.log("Session metadata:", session.metadata);

      const metadata = session.metadata || {};
      const userId = metadata.user_id;
      const subtotalCents = parseInt(metadata.subtotal_cents || "0");
      const shippingCents = parseInt(metadata.shipping_cents || "0");
      const totalCents = subtotalCents + shippingCents;

      // Parse items from metadata
      let items: Array<{ id: string; qty: number; price: number; name: string }> = [];
      try {
        items = JSON.parse(metadata.items_json || "[]");
      } catch (e) {
        console.error("Failed to parse items_json:", e);
      }

      // Get shipping details from Stripe session
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
      const { data: orderNumberData } = await supabaseAdmin.rpc("generate_order_number");
      const orderNumber = orderNumberData || `FP-${Date.now()}`;

      let orderId: string | null = null;
      let plantsCreated = 0;

      // Only create order if we have a valid user (not guest)
      if (userId && userId !== "guest") {
        // Create order
        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: userId,
            order_number: orderNumber,
            status: "paid",
            total_amount: totalCents / 100, // Convert to euros
            shipping_address: shippingAddress,
            notes: `Stripe session: ${session.id}`,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Failed to create order:", orderError);
          throw orderError;
        }

        console.log("Order created:", order.id);
        orderId = order.id;

        // Create order items
        for (const item of items) {
          const { error: itemError } = await supabaseAdmin
            .from("order_items")
            .insert({
              order_id: order.id,
              product_id: item.id,
              product_name: item.name,
              quantity: item.qty,
              unit_price: item.price / 100, // Convert to euros
            });

          if (itemError) {
            console.error("Failed to create order item:", itemError);
          }
        }

        console.log("Order items created for order:", order.id);

        // Create owned plants from the order
        try {
          const { data: plantsCount, error: plantsError } = await supabaseAdmin.rpc(
            "create_owned_plants_from_order",
            {
              p_order_id: order.id,
              p_user_id: userId,
            }
          );

          if (plantsError) {
            console.error("Failed to create owned plants:", plantsError);
          } else {
            plantsCreated = plantsCount || 0;
            console.log(`Created ${plantsCreated} owned plants for user ${userId}`);
          }
        } catch (plantsErr) {
          console.error("Error creating owned plants:", plantsErr);
        }

        // Match wishlist items to this order (auto-mark as acquired)
        try {
          const { data: wishlistMatched, error: wishlistError } = await supabaseAdmin.rpc(
            "match_wishlist_to_order",
            {
              p_order_id: order.id,
              p_user_id: userId,
            }
          );

          if (wishlistError) {
            console.error("Failed to match wishlist items:", wishlistError);
          } else if (wishlistMatched && wishlistMatched > 0) {
            console.log(`Matched ${wishlistMatched} wishlist items for user ${userId}`);
          }
        } catch (wishlistErr) {
          console.error("Error matching wishlist items:", wishlistErr);
        }
      } else {
        // Guest order - log for manual processing
        console.log("Guest order completed:", {
          sessionId: session.id,
          email: shippingAddress.email,
          total: totalCents / 100,
          items,
          shippingAddress,
        });
        
        // For guest orders, you might want to:
        // 1. Send an email notification to admin
        // 2. Store in a separate guest_orders table
        // 3. Create a temporary user and order
      }

      // Return info about what was created
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

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
