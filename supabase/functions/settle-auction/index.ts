import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_RATE = 0.06; // 6%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    // Authenticate: only admins or service role can settle
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: claimsData, error: claimsErr } = await supabaseClient.auth.getClaims(token);

    // Allow service_role or admin users
    const isServiceRole = claimsData?.claims?.role === "service_role";
    let isAdmin = false;
    if (!isServiceRole && claimsData?.claims?.sub) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", claimsData.claims.sub)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleData;
    }

    if (!isServiceRole && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { auction_id } = await req.json();
    if (!auction_id) throw new Error("auction_id is required");

    console.log("[settle-auction] Starting settlement for:", auction_id);

    // 1. Check if already settled
    const { data: existingSettlement } = await supabaseAdmin
      .from("auction_settlements")
      .select("id, status")
      .eq("auction_id", auction_id)
      .maybeSingle();

    if (existingSettlement) {
      return new Response(
        JSON.stringify({ error: "Already settled", settlement_id: existingSettlement.id, status: existingSettlement.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch auction
    const { data: auction, error: auctionErr } = await supabaseAdmin
      .from("auctions")
      .select("*")
      .eq("id", auction_id)
      .single();

    if (auctionErr || !auction) throw new Error("Auction not found");

    // Validate auction is ended
    if (auction.status === "live" && auction.ends_at && new Date(auction.ends_at) > new Date()) {
      throw new Error("Auction has not ended yet");
    }

    if (auction.total_bids === 0) {
      // No bids – mark as closed, no settlement needed
      await supabaseAdmin
        .from("auctions")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", auction_id);

      return new Response(
        JSON.stringify({ message: "No bids – auction closed without settlement" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reserve not met
    if (auction.reserve_price && !auction.reserve_met) {
      await supabaseAdmin
        .from("auctions")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", auction_id);

      // Refund all deposits
      await refundAllDeposits(supabaseAdmin, stripe, auction_id);

      return new Response(
        JSON.stringify({ message: "Reserve not met – auction closed, deposits refunded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find winning bid
    const { data: winningBid, error: bidErr } = await supabaseAdmin
      .from("bids")
      .select("*")
      .eq("auction_id", auction_id)
      .eq("status", "active")
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    if (bidErr || !winningBid) throw new Error("No valid winning bid found");

    const buyerUserId = winningBid.user_id;
    const sellerUserId = auction.seller_user_id || auction.created_by;
    const hammerPrice = winningBid.amount;

    // 4. Calculate fees
    const platformFeeAmount = Math.round(hammerPrice * PLATFORM_FEE_RATE * 100) / 100;
    const sellerPayoutAmount = Math.round((hammerPrice - platformFeeAmount) * 100) / 100;

    console.log("[settle-auction] Amounts:", { hammerPrice, platformFeeAmount, sellerPayoutAmount });

    // 5. Get buyer email
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", buyerUserId)
      .single();

    if (!buyerProfile?.email) throw new Error("Buyer profile/email not found");

    // 6. Get seller's Stripe Connect account
    const { data: sellerProfile } = await supabaseAdmin
      .from("seller_profiles")
      .select("stripe_account_id, legal_name")
      .eq("user_id", sellerUserId)
      .single();

    if (!sellerProfile?.stripe_account_id) {
      throw new Error("Seller does not have a connected Stripe account");
    }

    // 7. Create settlement record (pending)
    const { data: settlement, error: settlementErr } = await supabaseAdmin
      .from("auction_settlements")
      .insert({
        auction_id,
        buyer_user_id: buyerUserId,
        seller_user_id: sellerUserId,
        winning_bid_id: winningBid.id,
        hammer_price: hammerPrice,
        platform_fee_rate: PLATFORM_FEE_RATE,
        platform_fee_amount: platformFeeAmount,
        seller_payout_amount: sellerPayoutAmount,
        deposit_amount: auction.deposit_amount || 0,
        status: "pending",
      })
      .select()
      .single();

    if (settlementErr) throw new Error("Failed to create settlement: " + settlementErr.message);

    // 8. Charge buyer via Stripe Checkout (payment mode)
    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: buyerProfile.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Deduct deposit from amount if buyer has one
    let depositDeductCents = 0;
    const { data: buyerDeposit } = await supabaseAdmin
      .from("auction_deposits")
      .select("amount, stripe_payment_intent_id, status")
      .eq("auction_id", auction_id)
      .eq("user_id", buyerUserId)
      .eq("status", "held")
      .maybeSingle();

    if (buyerDeposit) {
      depositDeductCents = Math.round(buyerDeposit.amount * 100);
    }

    const hammerPriceCents = Math.round(hammerPrice * 100);
    const chargeAmountCents = hammerPriceCents - depositDeductCents;
    const platformFeeCents = Math.round(platformFeeAmount * 100);

    const origin = req.headers.get("origin") || "https://theremainder.lovable.app";

    if (chargeAmountCents > 0) {
      // Create a PaymentIntent with application_fee and transfer
      const paymentIntent = await stripe.paymentIntents.create({
        amount: chargeAmountCents,
        currency: "eur",
        customer: customerId,
        receipt_email: buyerProfile.email,
        application_fee_amount: Math.min(platformFeeCents, chargeAmountCents),
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
        metadata: {
          auction_id,
          settlement_id: settlement.id,
          type: "auction_settlement",
          buyer_user_id: buyerUserId,
          seller_user_id: sellerUserId,
          deposit_deducted_cents: depositDeductCents.toString(),
        },
        description: `Subasta: ${auction.title} – Lote ganador`,
        automatic_payment_methods: { enabled: true },
      });

      // Update settlement with Stripe info
      await supabaseAdmin
        .from("auction_settlements")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          deposit_deducted: depositDeductCents > 0,
          status: "buyer_invoiced",
        })
        .eq("id", settlement.id);

      console.log("[settle-auction] PaymentIntent created:", paymentIntent.id);

      // If buyer had a deposit, capture/convert it
      if (buyerDeposit) {
        await supabaseAdmin
          .from("auction_deposits")
          .update({ status: "applied", updated_at: new Date().toISOString() })
          .eq("auction_id", auction_id)
          .eq("user_id", buyerUserId);
      }
    } else {
      // Deposit covers the full amount – settle directly via transfer
      const platformFeeFromDeposit = Math.min(platformFeeCents, depositDeductCents);
      const sellerTransferCents = depositDeductCents - platformFeeFromDeposit;

      if (sellerTransferCents > 0) {
        const transfer = await stripe.transfers.create({
          amount: sellerTransferCents,
          currency: "eur",
          destination: sellerProfile.stripe_account_id,
          metadata: {
            auction_id,
            settlement_id: settlement.id,
            type: "auction_settlement_deposit_only",
          },
        });

        await supabaseAdmin
          .from("auction_settlements")
          .update({
            stripe_transfer_id: transfer.id,
            deposit_deducted: true,
            status: "seller_paid",
            settled_at: new Date().toISOString(),
          })
          .eq("id", settlement.id);
      }

      if (buyerDeposit) {
        await supabaseAdmin
          .from("auction_deposits")
          .update({ status: "applied", updated_at: new Date().toISOString() })
          .eq("auction_id", auction_id)
          .eq("user_id", buyerUserId);
      }
    }

    // 9. Create order record for the buyer
    const orderNumber = `SUB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: buyerUserId,
        order_number: orderNumber,
        total_amount: hammerPrice,
        status: chargeAmountCents > 0 ? "pending" : "paid",
        shipping_address: { full_name: buyerProfile.full_name || "Comprador subasta", note: "Subasta – pendiente datos envío" },
        notes: `Subasta: ${auction.title}`,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("[settle-auction] Order creation failed:", orderErr);
    } else {
      // Create order item
      await supabaseAdmin.from("order_items").insert({
        order_id: order.id,
        product_id: auction.plant_id || auction.id,
        product_name: auction.title,
        product_image: auction.images?.[0] || null,
        quantity: 1,
        unit_price: hammerPrice,
      });

      // Link order to settlement
      await supabaseAdmin
        .from("auction_settlements")
        .update({ order_id: order.id })
        .eq("id", settlement.id);

      // Generate invoice if already paid
      if (chargeAmountCents <= 0 && order.status === "paid") {
        try {
          const { data: invoiceId } = await supabaseAdmin.rpc("create_spanish_invoice_from_order", {
            p_order_id: order.id,
          });
          if (invoiceId) {
            await supabaseAdmin
              .from("auction_settlements")
              .update({ invoice_id: invoiceId })
              .eq("id", settlement.id);
          }
        } catch (invoiceErr) {
          console.error("[settle-auction] Invoice generation failed:", invoiceErr);
        }
      }
    }

    // 10. Update auction status
    await supabaseAdmin
      .from("auctions")
      .update({
        status: "closed",
        winner_user_id: buyerUserId,
        winning_bid_id: winningBid.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auction_id);

    // 11. Refund deposits of losing bidders
    await refundLosingDeposits(supabaseAdmin, stripe, auction_id, buyerUserId);

    // 12. Send winner notification
    try {
      await supabaseAdmin.functions.invoke("send-auction-notification", {
        body: {
          auction_id,
          type: "auction_won",
        },
      });
    } catch (notifErr) {
      console.error("[settle-auction] Notification failed:", notifErr);
    }

    console.log("[settle-auction] Settlement complete:", settlement.id);

    return new Response(
      JSON.stringify({
        settlement_id: settlement.id,
        status: chargeAmountCents > 0 ? "buyer_invoiced" : "seller_paid",
        hammer_price: hammerPrice,
        platform_fee: platformFeeAmount,
        seller_payout: sellerPayoutAmount,
        buyer_user_id: buyerUserId,
        order_id: order?.id,
        payment_intent_id: chargeAmountCents > 0 ? settlement.stripe_payment_intent_id : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[settle-auction] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Settlement failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Refund deposits for all bidders (auction with no winner) */
async function refundAllDeposits(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: InstanceType<typeof Stripe>,
  auctionId: string
) {
  const { data: deposits } = await supabaseAdmin
    .from("auction_deposits")
    .select("id, stripe_payment_intent_id, amount, user_id")
    .eq("auction_id", auctionId)
    .eq("status", "held");

  if (!deposits?.length) return;

  for (const dep of deposits) {
    try {
      await stripe.refunds.create({ payment_intent: dep.stripe_payment_intent_id });
      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", dep.id);
      console.log("[settle-auction] Refunded deposit for user:", dep.user_id);
    } catch (err) {
      console.error("[settle-auction] Deposit refund failed for:", dep.id, err);
    }
  }
}

/** Refund deposits for losing bidders only */
async function refundLosingDeposits(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: InstanceType<typeof Stripe>,
  auctionId: string,
  winnerUserId: string
) {
  const { data: deposits } = await supabaseAdmin
    .from("auction_deposits")
    .select("id, stripe_payment_intent_id, amount, user_id")
    .eq("auction_id", auctionId)
    .eq("status", "held")
    .neq("user_id", winnerUserId);

  if (!deposits?.length) return;

  for (const dep of deposits) {
    try {
      await stripe.refunds.create({ payment_intent: dep.stripe_payment_intent_id });
      await supabaseAdmin
        .from("auction_deposits")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", dep.id);
      console.log("[settle-auction] Refunded losing deposit for:", dep.user_id);
    } catch (err) {
      console.error("[settle-auction] Losing deposit refund failed:", dep.id, err);
    }
  }
}
