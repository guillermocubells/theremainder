/**
 * api-votes – Community vote endpoints
 *
 * POST   /api-votes   { review_id, vote_type }   → cast / change vote (upsert)
 * DELETE /api-votes   { review_id }               → remove vote
 *
 * Features:
 *  - Idempotent upsert (ON CONFLICT)
 *  - Rate-limited (auth_write preset)
 *  - Target-type safety (review must exist)
 *  - Automatic aggregate refresh via DB trigger (plant_reviews.score, plant_review_stats)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";
import { validate, schemas, z } from "../_shared/validation.ts";
import { checkRateLimit, PRESETS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

// ── Schemas ──

const castVoteSchema = z.object({
  review_id: schemas.uuid,
  vote_type: z.union([z.literal(1), z.literal(-1)]),
});

const removeVoteSchema = z.object({
  review_id: schemas.uuid,
});

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-votes", req);
  const rHeaders = withCorrelationId(corsHeaders, requestId);

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid authorization", 401, "UNAUTHORIZED");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      throw new AppError("Invalid token", 401, "UNAUTHORIZED");
    }
    const userId = claimsData.claims.sub as string;

    // ── Rate limit ──
    const rl = checkRateLimit(req, PRESETS.auth_write, userId);
    if (!rl.allowed) {
      log.warn("Rate limited", { key: rl.key });
      return rateLimitResponse(rl.headers, rHeaders);
    }

    // ── Route ──
    if (req.method === "POST") {
      return await handleCastVote(req, supabase, userId, rHeaders, rl.headers, log);
    }

    if (req.method === "DELETE") {
      return await handleRemoveVote(req, supabase, userId, rHeaders, rl.headers, log);
    }

    throw new AppError(`Method ${req.method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rHeaders, requestId, log);
  }
});

// ── POST: Cast / change vote ──

async function handleCastVote(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cors: Record<string, string>,
  rlHeaders: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(castVoteSchema, body, cors);
  if (parsed.error) return parsed.error;
  const { review_id, vote_type } = parsed.data;

  // Target-type safety: ensure review exists
  const { count, error: reviewErr } = await supabase
    .from("plant_reviews")
    .select("id", { count: "exact", head: true })
    .eq("id", review_id);

  if (reviewErr) throw new AppError("Failed to verify review", 500, "INTERNAL_ERROR");
  if (!count || count === 0) throw new AppError("Review not found", 404, "NOT_FOUND");

  // Prevent self-voting
  const { data: reviewOwner } = await supabase
    .from("plant_reviews")
    .select("user_id")
    .eq("id", review_id)
    .single();

  if (reviewOwner?.user_id === userId) {
    throw new AppError("Cannot vote on your own review", 403, "FORBIDDEN");
  }

  // Idempotent upsert
  const { data, error } = await supabase
    .from("review_votes")
    .upsert(
      { review_id, user_id: userId, vote_type },
      { onConflict: "review_id,user_id" }
    )
    .select("id, review_id, vote_type, created_at")
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Vote cast", { review_id, vote_type, userId });

  // Refresh aggregates (score on plant_reviews)
  await refreshReviewScore(supabase, review_id, log);

  // Fire-and-forget reputation events
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && reviewOwner?.user_id) {
    const repUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-reputation`;
    const repHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` };

    // Voter gets +1 for participating
    fetch(repUrl, { method: "POST", headers: repHeaders, body: JSON.stringify({
      user_id: userId, action_key: "vote_given",
      source_entity_type: "review", source_entity_id: review_id,
    }) }).catch(() => {});

    // Review owner gets upvote_received or downvote_received
    const ownerAction = vote_type === 1 ? "upvote_received" : "downvote_received";
    fetch(repUrl, { method: "POST", headers: repHeaders, body: JSON.stringify({
      user_id: reviewOwner.user_id, action_key: ownerAction,
      source_entity_type: "review", source_entity_id: review_id,
    }) }).catch(() => {});
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...cors, ...rlHeaders, "Content-Type": "application/json" },
  });
}

// ── DELETE: Remove vote ──

async function handleRemoveVote(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cors: Record<string, string>,
  rlHeaders: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Also support query param for DELETE
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("review_id");
    body = reviewId ? { review_id: reviewId } : null;
  }

  if (!body) throw new AppError("Missing review_id", 400, "BAD_REQUEST");

  const parsed = validate(removeVoteSchema, body, cors);
  if (parsed.error) return parsed.error;
  const { review_id } = parsed.data;

  const { error } = await supabase
    .from("review_votes")
    .delete()
    .eq("review_id", review_id)
    .eq("user_id", userId);

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Vote removed", { review_id, userId });

  // Refresh aggregates
  await refreshReviewScore(supabase, review_id, log);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, ...rlHeaders, "Content-Type": "application/json" },
  });
}

// ── Aggregate refresh ──

async function refreshReviewScore(
  supabase: ReturnType<typeof createClient>,
  reviewId: string,
  log: ReturnType<typeof createLogger>["log"]
) {
  // Sum up/down from review_votes
  const { count: upCount } = await supabase
    .from("review_votes")
    .select("id", { count: "exact", head: true })
    .eq("review_id", reviewId)
    .eq("vote_type", 1);

  const { count: downCount } = await supabase
    .from("review_votes")
    .select("id", { count: "exact", head: true })
    .eq("review_id", reviewId)
    .eq("vote_type", -1);

  const score = (upCount ?? 0) - (downCount ?? 0);

  const { error } = await supabase
    .from("plant_reviews")
    .update({ score })
    .eq("id", reviewId);

  if (error) {
    log.warn("Failed to update review score", { reviewId, error: error.message });
  } else {
    log.info("Score refreshed", { reviewId, score, up: upCount, down: downCount });
  }

  // Also update plant_review_stats if the table has data for this review's plant
  const { data: review } = await supabase
    .from("plant_reviews")
    .select("plant_id")
    .eq("id", reviewId)
    .single();

  if (review?.plant_id) {
    // Get totals for the plant
    const { count: totalUp } = await supabase
      .from("review_votes")
      .select("id", { count: "exact", head: true })
      .eq("vote_type", 1)
      .in(
        "review_id",
        // Sub-select: all review IDs for this plant
        (await supabase.from("plant_reviews").select("id").eq("plant_id", review.plant_id)).data?.map((r: { id: string }) => r.id) ?? []
      );

    const { count: totalDown } = await supabase
      .from("review_votes")
      .select("id", { count: "exact", head: true })
      .eq("vote_type", -1)
      .in(
        "review_id",
        (await supabase.from("plant_reviews").select("id").eq("plant_id", review.plant_id)).data?.map((r: { id: string }) => r.id) ?? []
      );

    await supabase
      .from("plant_review_stats")
      .upsert(
        {
          plant_id: review.plant_id,
          total_upvotes: totalUp ?? 0,
          total_downvotes: totalDown ?? 0,
          net_votes: (totalUp ?? 0) - (totalDown ?? 0),
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "plant_id" }
      );
  }
}
