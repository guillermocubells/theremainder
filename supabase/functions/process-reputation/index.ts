/**
 * process-reputation – Reputation engine & badge assignment
 *
 * POST { user_id, action_key, source_entity_type?, source_entity_id?, metadata? }
 *   → Records ledger entry, recomputes total, assigns/revokes badges, emits events
 *
 * GET ?user_id=<uuid>
 *   → Returns current reputation summary + badges
 *
 * Security: POST requires service-role key; GET is public.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";
import { validate, z, schemas } from "../_shared/validation.ts";
import { checkRateLimit, PRESETS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Schemas ──

const processSchema = z.object({
  user_id: schemas.uuid,
  action_key: z.string().min(1).max(50),
  source_entity_type: z.string().max(50).optional(),
  source_entity_id: schemas.uuid.optional(),
  metadata: z.record(z.unknown()).optional(),
});

const querySchema = z.object({
  user_id: schemas.uuid,
});

// ── Badge threshold type ──

interface BadgeThreshold {
  badge_key: string;
  label: string;
  min_score: number;
  icon: string | null;
  color: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("process-reputation", req);
  const rHeaders = withCorrelationId(corsHeaders, requestId);

  try {
    if (req.method === "GET") {
      return await handleQuery(req, rHeaders, log);
    }

    if (req.method === "POST") {
      return await handleProcess(req, rHeaders, log);
    }

    throw new AppError(`Method ${req.method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rHeaders, requestId, log);
  }
});

// ── GET: Public reputation summary ──

async function handleQuery(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = validate(querySchema, params, cors);
  if (parsed.error) return parsed.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: rep } = await supabase
    .from("user_reputation")
    .select("*")
    .eq("user_id", parsed.data.user_id)
    .maybeSingle();

  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_key, awarded_at")
    .eq("user_id", parsed.data.user_id)
    .is("revoked_at", null);

  log.info("Reputation queried", { user_id: parsed.data.user_id });

  return new Response(
    JSON.stringify({
      data: {
        user_id: parsed.data.user_id,
        total_score: rep?.total_score ?? 0,
        level: rep?.level ?? "newcomer",
        badges: badges ?? [],
      },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

// ── POST: Process reputation event ──

async function handleProcess(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  // Require service role or valid user auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Missing authorization", 401, "UNAUTHORIZED");
  }

  // Use service role client for all writes (RLS blocks anon inserts)
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new AppError("Server configuration error", 500, "CONFIG_ERROR");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey
  );

  // Verify caller is authenticated (service role or user JWT)
  const token = authHeader.replace("Bearer ", "");
  const isServiceRole = token === serviceKey;

  if (!isServiceRole) {
    // Verify user JWT
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { error: claimsErr } = await supabaseAuth.auth.getUser(token);
    if (claimsErr) throw new AppError("Invalid token", 401, "UNAUTHORIZED");

    // Rate limit non-service callers
    const rl = checkRateLimit(req, PRESETS.auth_write, token.slice(-8));
    if (!rl.allowed) return rateLimitResponse(rl.headers, cors);
  }

  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(processSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { user_id, action_key, source_entity_type, source_entity_id, metadata } = parsed.data;

  // 1. Look up the reputation rule to get the delta
  const { data: rule } = await supabaseAdmin
    .from("reputation_rules")
    .select("delta, is_active")
    .eq("action_key", action_key)
    .single();

  if (!rule) throw new AppError(`Unknown action_key: ${action_key}`, 422, "UNKNOWN_ACTION");
  if (!rule.is_active) throw new AppError(`Action ${action_key} is disabled`, 422, "ACTION_DISABLED");

  const delta = rule.delta;

  // 2. Insert ledger entry
  const { error: ledgerErr } = await supabaseAdmin
    .from("reputation_ledger")
    .insert({
      user_id,
      action_key,
      delta,
      source_entity_type: source_entity_type ?? null,
      source_entity_id: source_entity_id ?? null,
      metadata: metadata ?? {},
    });

  if (ledgerErr) throw new AppError(ledgerErr.message, 500, "DB_ERROR");

  // 3. Recompute total from ledger (authoritative sum)
  const { data: sumResult } = await supabaseAdmin
    .from("reputation_ledger")
    .select("delta")
    .eq("user_id", user_id);

  const totalScore = (sumResult ?? []).reduce((acc: number, r: { delta: number }) => acc + r.delta, 0);

  // 4. Determine level from badge thresholds
  const { data: thresholds } = await supabaseAdmin
    .from("badge_thresholds")
    .select("badge_key, label, min_score, icon, color")
    .order("min_score", { ascending: false });

  const allThresholds = (thresholds ?? []) as BadgeThreshold[];
  const currentLevel = allThresholds.find((t) => totalScore >= t.min_score);
  const levelName = currentLevel?.badge_key ?? "newcomer";

  // 5. Upsert user_reputation
  const { error: repErr } = await supabaseAdmin
    .from("user_reputation")
    .upsert(
      {
        user_id,
        total_score: totalScore,
        level: levelName,
        last_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (repErr) throw new AppError(repErr.message, 500, "DB_ERROR");

  // 6. Assign / revoke badges
  const earnedBadgeKeys = allThresholds
    .filter((t) => totalScore >= t.min_score)
    .map((t) => t.badge_key);

  // Get current active badges
  const { data: currentBadges } = await supabaseAdmin
    .from("user_badges")
    .select("id, badge_key, revoked_at")
    .eq("user_id", user_id);

  const activeBadges = (currentBadges ?? []).filter((b: { revoked_at: string | null }) => !b.revoked_at);
  const activeBadgeKeys = new Set(activeBadges.map((b: { badge_key: string }) => b.badge_key));

  const events: Array<{ user_id: string; event_type: string; payload: Record<string, unknown> }> = [];

  // Emit score_changed event
  events.push({
    user_id,
    event_type: "score_changed",
    payload: { action_key, delta, new_total: totalScore, level: levelName },
  });

  // Award new badges
  for (const key of earnedBadgeKeys) {
    if (!activeBadgeKeys.has(key)) {
      const { error: awardErr } = await supabaseAdmin
        .from("user_badges")
        .upsert(
          { user_id, badge_key: key, awarded_at: new Date().toISOString(), revoked_at: null },
          { onConflict: "user_id,badge_key" }
        );

      if (!awardErr) {
        const badge = allThresholds.find((t) => t.badge_key === key);
        events.push({
          user_id,
          event_type: "badge_awarded",
          payload: { badge_key: key, label: badge?.label, icon: badge?.icon },
        });
        log.info("Badge awarded", { user_id, badge_key: key });
      }
    }
  }

  // Revoke badges no longer earned
  for (const active of activeBadges) {
    if (!earnedBadgeKeys.includes(active.badge_key)) {
      await supabaseAdmin
        .from("user_badges")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", active.id);

      events.push({
        user_id,
        event_type: "badge_revoked",
        payload: { badge_key: active.badge_key },
      });
      log.info("Badge revoked", { user_id, badge_key: active.badge_key });
    }
  }

  // 7. Insert all events (for UI/notifications via realtime)
  if (events.length > 0) {
    await supabaseAdmin.from("reputation_events").insert(events);
  }

  log.info("Reputation processed", { user_id, action_key, delta, totalScore, level: levelName });

  return new Response(
    JSON.stringify({
      data: {
        user_id,
        action_key,
        delta,
        total_score: totalScore,
        level: levelName,
        badges_awarded: events.filter((e) => e.event_type === "badge_awarded").map((e) => e.payload.badge_key),
        badges_revoked: events.filter((e) => e.event_type === "badge_revoked").map((e) => e.payload.badge_key),
      },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
  );
}
