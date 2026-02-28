/**
 * api-verification – Verification workflow with evidence
 *
 * POST   { target_type, target_id, evidence_urls, notes? }  → submit verification request (auth user)
 * GET    ?status=pending&page=1&limit=20                    → list requests (own for user, all for moderator)
 * PATCH  { id, action: 'approve'|'reject', notes? }         → moderator review
 *
 * On approve: links verification to target (sets is_verified on review, etc.)
 *             and triggers verification_accepted reputation (+10)
 * On reject:  notifies user via reputation_events
 * All actions audited to audit_logs.
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
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

// ── Schemas ──

const submitSchema = z.object({
  target_type: z.enum(["review", "plant", "collection_item"]),
  target_id: schemas.uuid,
  evidence_urls: z.array(z.string().url().max(2000)).min(1).max(10),
  notes: z.string().max(2000).optional(),
});

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const reviewSchema = z.object({
  id: schemas.uuid,
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(2000).optional(),
});

// ── Helpers ──

async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Missing authorization", 401, "UNAUTHORIZED");
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new AppError("Invalid token", 401, "UNAUTHORIZED");
  return { supabase, userId: data.user.id };
}

async function checkModerator(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isMod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
  if (isAdmin) return "admin";
  if (isMod) return "moderator";
  return null;
}

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-verification", req);
  const rHeaders = withCorrelationId(corsHeaders, requestId);

  try {
    if (req.method === "POST") return await handleSubmit(req, rHeaders, log);
    if (req.method === "GET") return await handleList(req, rHeaders, log);
    if (req.method === "PATCH") return await handleReview(req, rHeaders, log);
    throw new AppError(`Method ${req.method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rHeaders, requestId, log);
  }
});

// ── POST: Submit verification request ──

async function handleSubmit(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);

  const rl = checkRateLimit(req, PRESETS.form_submit, userId);
  if (!rl.allowed) return rateLimitResponse(rl.headers, cors);

  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(submitSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { target_type, target_id, evidence_urls, notes } = parsed.data;

  // Check for existing pending/approved request
  const { count } = await supabase
    .from("verification_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .in("status", ["pending", "approved"]);

  if ((count ?? 0) > 0) {
    throw new AppError("A verification request already exists for this item", 409, "ALREADY_EXISTS");
  }

  const { data, error } = await supabase
    .from("verification_requests")
    .insert({
      user_id: userId,
      target_type,
      target_id,
      evidence_urls,
      notes: notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Verification submitted", { id: data.id, target_type, target_id });

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...cors, ...rl.headers, "Content-Type": "application/json" },
  });
}

// ── GET: List verification requests ──

async function handleList(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);
  const role = await checkModerator(supabase, userId);

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = validate(listSchema, params, cors);
  if (parsed.error) return parsed.error;
  const { status, page, limit } = parsed.data;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("verification_requests")
    .select("*", { count: "exact" });

  // Non-moderators only see their own (RLS handles this too, but be explicit)
  if (!role) {
    query = query.eq("user_id", userId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Verifications listed", { role: role ?? "user", status, page, count });

  return new Response(
    JSON.stringify({
      data: data ?? [],
      pagination: { page, limit, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / limit) },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

// ── PATCH: Moderator approve/reject ──

async function handleReview(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);
  const role = await checkModerator(supabase, userId);
  if (!role) throw new AppError("Insufficient permissions", 403, "FORBIDDEN");

  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(reviewSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { id, action, notes } = parsed.data;

  // Get current request
  const { data: request } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) throw new AppError("Verification request not found", 404, "NOT_FOUND");
  if (request.status !== "pending") throw new AppError("Request already reviewed", 422, "ALREADY_REVIEWED");

  const newStatus = action === "approve" ? "approved" : "rejected";

  // Update request
  const { data: updated, error } = await supabase
    .from("verification_requests")
    .update({
      status: newStatus,
      reviewer_id: userId,
      reviewer_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  // Service role for cross-cutting ops
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey) {
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Audit log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await adminClient.from("audit_logs").insert({
      actor_id: userId,
      actor_role: role,
      action: `verification_${action}`,
      entity_type: "verification_request",
      entity_id: id,
      old_data: { status: request.status },
      new_data: { status: newStatus, reviewer_notes: notes },
      ip_address: ip,
      metadata: { target_type: request.target_type, target_id: request.target_id },
    });

    if (action === "approve") {
      // Link verification to target item
      await linkVerificationToTarget(adminClient, request.target_type, request.target_id, log);

      // Reputation reward
      const repUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-reputation`;
      fetch(repUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: request.user_id,
          action_key: "verification_accepted",
          source_entity_type: request.target_type,
          source_entity_id: request.target_id,
        }),
      }).catch(() => {});
    }

    // Emit event for user notification
    await adminClient.from("reputation_events").insert({
      user_id: request.user_id,
      event_type: action === "approve" ? "verification_approved" : "verification_rejected",
      payload: {
        request_id: id,
        target_type: request.target_type,
        target_id: request.target_id,
        reviewer_notes: notes ?? null,
      },
    });
  }

  log.info("Verification reviewed", { id, action, by: userId });

  return new Response(JSON.stringify({ data: updated }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Link verification to target item ──

async function linkVerificationToTarget(
  adminClient: ReturnType<typeof createClient>,
  targetType: string,
  targetId: string,
  log: ReturnType<typeof createLogger>["log"]
) {
  try {
    if (targetType === "review") {
      await adminClient
        .from("plant_reviews")
        .update({ is_verified: true })
        .eq("id", targetId);
      log.info("Review marked verified", { targetId });
    } else if (targetType === "collection_item") {
      // Mark the owned plant as verified
      const { data: item } = await adminClient
        .from("collection_items")
        .select("owned_plant_id")
        .eq("id", targetId)
        .single();

      if (item?.owned_plant_id) {
        await adminClient
          .from("owned_plants")
          .update({ is_verified: true })
          .eq("id", item.owned_plant_id);
        log.info("Collection item marked verified", { targetId });
      }
    }
    // 'plant' type — no direct verification flag on plants table currently
  } catch (err) {
    log.warn("Failed to link verification", { targetType, targetId, error: String(err) });
  }
}
