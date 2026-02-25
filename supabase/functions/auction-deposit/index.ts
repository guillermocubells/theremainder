import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Validation ──
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ["create", "confirm", "refund"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Rate limit per user
    const rl = checkRateLimit(req, PRESETS.auth_write, userId);
    if (!rl.allowed) {
      return rateLimitResponse(rl.headers, corsHeaders);
    }

    const { action, auction_id } = await req.json();

    // Validate action
    if (!action || typeof action !== "string" || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Expected: create, confirm, or refund" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auction_id
    if (!auction_id || typeof auction_id !== "string" || !UUID_RE.test(auction_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing auction_id (expected UUID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // ─── CREATE DEPOSIT HOLD ───
    if (action === "create") {
      // Get auction details
      const { data: auction, error: auctionErr } = await supabaseAdmin
        .from("auctions")
        .select("id, title, deposit_amount, status")
        .eq("id", auction_id)
        .single();

      if (auctionErr || !auction) throw new Error("Auction not found");
      if (!auction.deposit_amount || auction.deposit_amount <= 0) {
        throw new Error("This auction does not require a deposit");
      }
      if (auction.status !== "live" && auction.status !== "scheduled") {
        throw new Error("Auction is not accepting deposits");
      }

      // Check if deposit already exists
      const { data: existing } = await supabaseAdmin
        .from("auction_deposits")
        .select("id, status, stripe_payment_intent_id")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .single();

      if (existing?.status === "held") {
        return new Response(
          JSON.stringify({ status: "already_held", deposit_id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find or create Stripe customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: userEmail });
        customerId = customer.id;
      }

      // Create payment intent with manual capture (hold)
      const amountCents = Math.round(auction.deposit_amount * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        customer: customerId,
        capture_method: "manual",
        metadata: {
          auction_id,
          user_id: userId,
          type: "auction_deposit",
        },
        description: `Depósito subasta: ${auction.title}`,
      });

      // If previous deposit was released/refunded, update row; else insert
      if (existing) {
        await supabaseAdmin
          .from("auction_deposits")
          .update({
            amount: auction.deposit_amount,
            stripe_payment_intent_id: paymentIntent.id,
            status: "held",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("auction_deposits").insert({
          auction_id,
          user_id: userId,
          amount: auction.deposit_amount,
          stripe_payment_intent_id: paymentIntent.id,
          status: "held",
        });
      }

      return new Response(
        JSON.stringify({
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          amount: auction.deposit_amount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CONFIRM DEPOSIT (after client-side confirmation) ───
    if (action === "confirm") {
      const { data: deposit } = await supabaseAdmin
        .from("auction_deposits")
        .select("id, stripe_payment_intent_id")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .single();

      if (!deposit) throw new Error("Deposit not found");

      // Verify the payment intent is authorized
      const pi = await stripe.paymentIntents.retrieve(
        deposit.stripe_payment_intent_id
      );
      if (
        pi.status !== "requires_capture" &&
        pi.status !== "succeeded"
      ) {
        throw new Error(
          `Payment not authorized. Status: ${pi.status}`
        );
      }

      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "held", updated_at: new Date().toISOString() })
        .eq("id", deposit.id);

      return new Response(
        JSON.stringify({ status: "held", deposit_id: deposit.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── REFUND DEPOSIT ───
    if (action === "refund") {
      const { data: deposit } = await supabaseAdmin
        .from("auction_deposits")
        .select("id, stripe_payment_intent_id, status")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .single();

      if (!deposit) throw new Error("Deposit not found");
      if (deposit.status !== "held") {
        return new Response(
          JSON.stringify({ status: deposit.status, message: "Not held" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cancel the uncaptured payment intent (releases the hold)
      try {
        await stripe.paymentIntents.cancel(deposit.stripe_payment_intent_id);
      } catch {
        // If already cancelled or captured, try refund
        await stripe.refunds.create({
          payment_intent: deposit.stripe_payment_intent_id,
        });
      }

      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", deposit.id);

      return new Response(
        JSON.stringify({ status: "refunded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("auction-deposit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
