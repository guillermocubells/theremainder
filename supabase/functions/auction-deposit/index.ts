import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("auction-deposit", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const rl = checkRateLimit(req, PRESETS.auth_write, userId);
    if (!rl.allowed) {
      return rateLimitResponse(rl.headers, corsHeaders);
    }

    const body = await req.json();

    const v = validate(schemas.auctionDeposit, body, rh);
    if (v.error) return v.error;

    const { action, auction_id } = v.data;

    log.info("Deposit action", { action, auction_id, user_id: userId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // ─── CREATE DEPOSIT HOLD ───
    if (action === "create") {
      const { data: auction, error: auctionErr } = await supabaseAdmin
        .from("auctions")
        .select("id, title, deposit_amount, status")
        .eq("id", auction_id)
        .single();

      if (auctionErr || !auction) throw new AppError("Auction not found", 404, "AUCTION_NOT_FOUND");
      if (!auction.deposit_amount || auction.deposit_amount <= 0) {
        throw new AppError("This auction does not require a deposit", 400, "NO_DEPOSIT_REQUIRED");
      }
      if (auction.status !== "live" && auction.status !== "scheduled") {
        throw new AppError("Auction is not accepting deposits", 400, "AUCTION_NOT_ACCEPTING");
      }

      const { data: existing } = await supabaseAdmin
        .from("auction_deposits")
        .select("id, status, stripe_payment_intent_id")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .single();

      if (existing?.status === "held") {
        log.info("Deposit already held", { deposit_id: existing.id });
        return new Response(
          JSON.stringify({ status: "already_held", deposit_id: existing.id }),
          { headers: { ...rh, "Content-Type": "application/json" } }
        );
      }

      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: userEmail });
        customerId = customer.id;
      }

      const amountCents = Math.round(auction.deposit_amount * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        customer: customerId,
        capture_method: "manual",
        metadata: { auction_id, user_id: userId, type: "auction_deposit", request_id: requestId },
        description: `Depósito subasta: ${auction.title}`,
      });

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

      log.info("Deposit created", { pi: paymentIntent.id, amount: auction.deposit_amount });

      return new Response(
        JSON.stringify({
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          amount: auction.deposit_amount,
        }),
        { headers: { ...rh, "Content-Type": "application/json" } }
      );
    }

    // ─── CONFIRM DEPOSIT ───
    if (action === "confirm") {
      const { data: deposit } = await supabaseAdmin
        .from("auction_deposits")
        .select("id, stripe_payment_intent_id")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .single();

      if (!deposit) throw new AppError("Deposit not found", 404, "DEPOSIT_NOT_FOUND");

      const pi = await stripe.paymentIntents.retrieve(deposit.stripe_payment_intent_id);
      if (pi.status !== "requires_capture" && pi.status !== "succeeded") {
        throw new AppError(`Payment not authorized. Status: ${pi.status}`, 400, "PAYMENT_NOT_AUTHORIZED");
      }

      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "held", updated_at: new Date().toISOString() })
        .eq("id", deposit.id);

      log.info("Deposit confirmed", { deposit_id: deposit.id });

      return new Response(
        JSON.stringify({ status: "held", deposit_id: deposit.id }),
        { headers: { ...rh, "Content-Type": "application/json" } }
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

      if (!deposit) throw new AppError("Deposit not found", 404, "DEPOSIT_NOT_FOUND");
      if (deposit.status !== "held") {
        return new Response(
          JSON.stringify({ status: deposit.status, message: "Not held" }),
          { headers: { ...rh, "Content-Type": "application/json" } }
        );
      }

      try {
        await stripe.paymentIntents.cancel(deposit.stripe_payment_intent_id);
      } catch {
        await stripe.refunds.create({ payment_intent: deposit.stripe_payment_intent_id });
      }

      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", deposit.id);

      log.info("Deposit refunded", { deposit_id: deposit.id });

      return new Response(
        JSON.stringify({ status: "refunded" }),
        { headers: { ...rh, "Content-Type": "application/json" } }
      );
    }

    throw new AppError(`Unknown action: ${action}`, 400, "UNKNOWN_ACTION");
  } catch (err) {
    return handleError(err, { ...corsHeaders, "Content-Type": "application/json" }, requestId, log);
  }
});
