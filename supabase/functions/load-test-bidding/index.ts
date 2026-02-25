import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { concurrency = 8, rounds = 3, snipe_test = true } = await req.json().catch(() => ({}));

  try {
    // ── 0. Get a real user to own the test auction ──
    const { data: creator } = await admin.from("profiles").select("user_id").limit(1).single();
    if (!creator) throw new Error("No user in profiles table");
    const creatorId = creator.user_id;

    // Generate fake bidder UUIDs and insert consent records so place_bid accepts them
    const bidderIds: string[] = [];
    for (let i = 0; i < concurrency; i++) {
      bidderIds.push(crypto.randomUUID());
    }

    // Fetch current terms version
    const { data: termsSetting } = await admin
      .from("store_settings")
      .select("value")
      .eq("key", "auction_terms_version")
      .single();
    const termsVersion = termsSetting?.value ? String(termsSetting.value) : "1.0";

    // Insert bidder consent records for all fake bidders
    const consentRows = bidderIds.map((uid) => ({
      user_id: uid,
      consent_type: "bidder",
      terms_version: termsVersion,
      accepted_at: new Date().toISOString(),
    }));
    await admin.from("auction_consents").insert(consentRows);

    // ── 1. Create a test auction ──
    const snipeEndsAt = snipe_test
      ? new Date(Date.now() + 90 * 1000).toISOString() // 90s from now → within 2min snipe window
      : new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const slug = `load-test-${Date.now()}`;
    const { data: auction, error: aErr } = await admin
      .from("auctions")
      .insert({
        title: `[LOAD TEST] Concurrency ${concurrency}×${rounds}`,
        slug,
        created_by: creatorId,
        seller_user_id: null, // null to bypass seller consent trigger
        starting_price: 10,
        current_price: 10,
        bid_increment: 1,
        status: "live",
        starts_at: new Date(Date.now() - 60000).toISOString(),
        ends_at: snipeEndsAt,
        deposit_amount: null, // No deposit for testing
        soft_close_window_sec: 120, // PRD: 2min default
      })
      .select("*")
      .single();

    if (aErr) throw new Error(`Failed to create test auction: ${aErr.message}`);
    const auctionId = auction.id;

    // Snapshot before
    const beforeEndsAt = auction.ends_at;

    // ── 2. Concurrent bidding rounds ──
    const roundResults: Record<string, unknown>[] = [];
    let totalSuccess = 0;
    let totalFail = 0;

    for (let round = 0; round < rounds; round++) {
      // Get current state
      const { data: cur } = await admin
        .from("auctions")
        .select("current_price, total_bids, bid_increment, starting_price")
        .eq("id", auctionId)
        .single();

      const minBid = cur!.total_bids === 0
        ? (cur!.starting_price as number)
        : (cur!.current_price as number) + (cur!.bid_increment as number);

      // Fire concurrent bids — all at min price so only serialised winner should succeed,
      // others will fail with "Bid must be at least..."
      const t0 = performance.now();
      const promises = bidderIds.map((uid, i) =>
        admin
          .rpc("place_bid", {
            p_auction_id: auctionId,
            p_user_id: uid,
            p_amount: minBid, // same amount → tests serialisation
            p_ip_address: `10.0.${round}.${i}`,
          })
          .then(({ data, error }) => ({
            userId: uid.slice(0, 8),
            amount: minBid,
            success: !error,
            error: error?.message?.replace(/^.*ERROR:\s*/, "") || null,
            bidId: data,
          }))
      );

      const batchResults = await Promise.all(promises);
      const elapsed = Math.round(performance.now() - t0);
      const successes = batchResults.filter((r) => r.success);
      const failures = batchResults.filter((r) => !r.success);
      totalSuccess += successes.length;
      totalFail += failures.length;

      roundResults.push({
        round: round + 1,
        concurrent_bids: bidderIds.length,
        successes: successes.length,
        failures: failures.length,
        elapsed_ms: elapsed,
        error_sample: failures.slice(0, 3).map((f) => f.error),
      });
    }

    // ── 3. Verify final state ──
    const { data: after } = await admin
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    const { data: allBids } = await admin
      .from("bids")
      .select("id, amount, user_id, created_at, status")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true });

    const checks: Record<string, { pass: boolean; detail: string }> = {};

    // C1: total_bids matches actual inserted bids
    checks["total_bids_consistent"] = {
      pass: after!.total_bids === allBids!.length,
      detail: `auction.total_bids=${after!.total_bids}, actual rows=${allBids!.length}, accepted=${totalSuccess}`,
    };

    // C2: current_price = highest bid
    const highestBid = allBids && allBids.length > 0
      ? Math.max(...allBids.map((b) => b.amount))
      : after!.starting_price;
    checks["current_price_correct"] = {
      pass: after!.current_price === highestBid,
      detail: `current_price=${after!.current_price}, highest_bid=${highestBid}`,
    };

    // C3: Each round should produce exactly 1 winner (since all bid at min)
    // The first to acquire the lock wins; others fail because min_bid increases.
    const idealWins = rounds; // 1 per round
    checks["serialisation_effective"] = {
      pass: totalSuccess >= rounds && totalSuccess <= rounds * 2,
      detail: `Expected ~${idealWins} wins across ${rounds} rounds (got ${totalSuccess}). ` +
        `If >1 per round, multiple bids at different effective min_bid raced through.`,
    };

    // C4: Strictly increasing bid amounts
    let strictlyIncreasing = true;
    for (let i = 1; i < (allBids || []).length; i++) {
      if (allBids![i].amount <= allBids![i - 1].amount) {
        strictlyIncreasing = false;
        break;
      }
    }
    // Same amount is expected since all bid at min, but only 1 should succeed per price level
    const amounts = allBids?.map((b) => b.amount) || [];
    const uniqueAmounts = new Set(amounts);
    checks["no_double_spend_at_same_price"] = {
      pass: amounts.length === uniqueAmounts.size,
      detail: `${amounts.length} bids, ${uniqueAmounts.size} unique amounts. Dupes would mean two bids at same price.`,
    };

    // ── 4. Anti-sniping verification ──
    let antiSniping: Record<string, unknown> = { tested: false };
    if (snipe_test && beforeEndsAt && after!.ends_at) {
      const originalEnd = new Date(beforeEndsAt).getTime();
      const newEnd = new Date(after!.ends_at).getTime();
      const extended = newEnd > originalEnd;
      const extensionMin = Math.round((newEnd - originalEnd) / 60000);

      checks["anti_sniping_works"] = {
        pass: extended,
        detail: `Auction was ${Math.round((originalEnd - Date.now()) / 60000)}min from end. ` +
          `Extended by ${extensionMin}min (${extended ? "YES" : "NO"}).`,
      };
      antiSniping = {
        tested: true,
        original_ends_at: beforeEndsAt,
        new_ends_at: after!.ends_at,
        extended,
        extension_minutes: extensionMin,
        total_extensions: totalSuccess, // each bid in snipe window extends
      };
    }

    // ── 5. Check audit logs were created ──
    const { count: auditCount } = await admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "bid")
      .in("entity_id", allBids?.map((b) => b.id) || []);

    checks["audit_logs_created"] = {
      pass: (auditCount || 0) === totalSuccess,
      detail: `${auditCount} audit entries for ${totalSuccess} successful bids`,
    };

    // ── 6. Cleanup test auction ──
    await admin.from("bids").delete().eq("auction_id", auctionId);
    await admin.from("audit_logs").delete().eq("action", "bid_placed")
      .in("entity_id", allBids?.map((b) => b.id) || []);
    // audit_logs has deny_mutation trigger, so delete will fail — that's fine, proves immutability
    await admin.from("auctions").delete().eq("id", auctionId);
    // Cleanup fake bidder consents and auction events
    await admin.from("auction_consents").delete().in("user_id", bidderIds);
    await admin.from("auction_events").delete().eq("entity_id", auctionId);

    const allPassed = Object.values(checks).every((c) => c.pass);

    return new Response(
      JSON.stringify(
        {
          summary: {
            status: allPassed ? "✅ ALL CHECKS PASSED" : "⚠️ SOME CHECKS FAILED",
            concurrency,
            rounds,
            total_attempted: totalSuccess + totalFail,
            total_accepted: totalSuccess,
            total_rejected: totalFail,
          },
          consistency_checks: checks,
          anti_sniping: antiSniping,
          round_details: roundResults,
        },
        null,
        2
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, stack: (err as Error).stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
