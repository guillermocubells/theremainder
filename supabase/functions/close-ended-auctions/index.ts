import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { log, requestId } = createLogger("close-ended-auctions", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Call the close_ended_auctions DB function
    const { data, error } = await admin.rpc("close_ended_auctions");
    if (error) throw error;

    const closed = data as number;
    log.info("Closed auctions", { count: closed });

    // For each newly ended auction that has bids + reserve met, trigger settlement
    if (closed > 0) {
      const { data: toSettle } = await admin
        .from("auctions")
        .select("id")
        .eq("status", "ended")
        .eq("reserve_met", true)
        .gt("total_bids", 0)
        .not("id", "in", `(SELECT auction_id FROM auction_settlements)`)
        .limit(10);

      // Use a simpler approach - query ended auctions without settlements
      const { data: endedAuctions } = await admin
        .from("auctions")
        .select("id")
        .eq("status", "ended")
        .eq("reserve_met", true)
        .gt("total_bids", 0)
        .limit(10);

      if (endedAuctions && endedAuctions.length > 0) {
        for (const auction of endedAuctions) {
          // Check if already has a settlement
          const { data: existing } = await admin
            .from("auction_settlements")
            .select("id")
            .eq("auction_id", auction.id)
            .maybeSingle();

          if (!existing) {
            log.info("Triggering settlement", { auction_id: auction.id });
            // Enqueue settlement job
            await admin.from("job_queue").insert({
              job_type: "settle_auction",
              payload: { auction_id: auction.id },
              priority: 1,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ closed, request_id: requestId }),
      { headers: { ...rh, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log.error("Failed", { error: (err as Error).message });
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...rh, "Content-Type": "application/json" } }
    );
  }
});
