/**
 * api-moderation – Content report & moderation queue
 *
 * POST   { entity_type, entity_id, reason, details? }  → create report (auth user)
 * GET    ?status=pending&page=1&limit=20               → list reports (moderator/admin)
 * PATCH  { id, action, notes? }                        → take action: dismiss, warn, remove (moderator/admin)
 *
 * Permission checks via has_role(). All actions audited to audit_logs.
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

const createReportSchema = z.object({
  entity_type: z.enum(["review", "comment", "plant", "collection"]),
  entity_id: schemas.uuid,
  reason: z.enum(["spam", "offensive", "misinformation", "harassment", "other"]),
  details: z.string().max(1000).optional(),
});

const listReportsSchema = z.object({
  status: z.enum(["pending", "reviewed", "dismissed", "actioned"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const takeActionSchema = z.object({
  id: schemas.uuid,
  action: z.enum(["dismiss", "warn", "remove"]),
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

async function requireModerator(supabase: ReturnType<typeof createClient>, userId: string) {
  // Check via has_role RPC
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isMod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });

  if (!isAdmin && !isMod) {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }
  return isAdmin ? "admin" : "moderator";
}

async function writeAuditLog(
  adminClient: ReturnType<typeof createClient>,
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  oldData: unknown,
  newData: unknown,
  ip: string | null
) {
  await adminClient.from("audit_logs").insert({
    actor_id: actorId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
    ip_address: ip,
    metadata: {},
  });
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-moderation", req);
  const rHeaders = withCorrelationId(corsHeaders, requestId);

  try {
    if (req.method === "POST") return await handleCreateReport(req, rHeaders, log);
    if (req.method === "GET") return await handleListReports(req, rHeaders, log);
    if (req.method === "PATCH") return await handleTakeAction(req, rHeaders, log);

    throw new AppError(`Method ${req.method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rHeaders, requestId, log);
  }
});

// ── POST: Create report ──

async function handleCreateReport(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);

  // Rate limit
  const rl = checkRateLimit(req, PRESETS.form_submit, userId);
  if (!rl.allowed) return rateLimitResponse(rl.headers, cors);

  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(createReportSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { entity_type, entity_id, reason, details } = parsed.data;

  // Check for duplicate report
  const { count } = await supabase
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .eq("user_id", userId);

  if ((count ?? 0) > 0) {
    throw new AppError("You have already reported this content", 409, "ALREADY_REPORTED");
  }

  const { data, error } = await supabase
    .from("content_reports")
    .insert({
      entity_type,
      entity_id,
      user_id: userId,
      reason,
      details: details ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Report created", { id: data.id, entity_type, entity_id, reason });

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...cors, ...rl.headers, "Content-Type": "application/json" },
  });
}

// ── GET: List reports (moderator/admin only) ──

async function handleListReports(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);
  await requireModerator(supabase, userId);

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = validate(listReportsSchema, params, cors);
  if (parsed.error) return parsed.error;
  const { status, page, limit } = parsed.data;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("content_reports")
    .select("*", { count: "exact" });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Reports listed", { status, page, count });

  return new Response(
    JSON.stringify({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

// ── PATCH: Take moderation action ──

async function handleTakeAction(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const { supabase, userId } = await requireAuth(req);
  const role = await requireModerator(supabase, userId);

  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(takeActionSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { id, action, notes } = parsed.data;

  // Get current report
  const { data: report } = await supabase
    .from("content_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) throw new AppError("Report not found", 404, "NOT_FOUND");
  if (report.status !== "pending") {
    throw new AppError("Report already resolved", 422, "ALREADY_RESOLVED");
  }

  // Map action to status
  const statusMap: Record<string, string> = {
    dismiss: "dismissed",
    warn: "actioned",
    remove: "actioned",
  };

  const newStatus = statusMap[action];

  // Update report
  const { data: updated, error } = await supabase
    .from("content_reports")
    .update({
      status: newStatus,
      resolution_action: action,
      resolution_notes: notes ?? null,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  // Service role client for cross-cutting operations
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey) {
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Audit log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await writeAuditLog(
      adminClient, userId, role,
      `moderation_${action}`,
      "content_report", id,
      { status: report.status },
      { status: newStatus, resolution_action: action, resolution_notes: notes },
      ip
    );

    // If action is "remove", soft-delete the reported content
    if (action === "remove") {
      await handleContentRemoval(adminClient, report.entity_type, report.entity_id, log);
    }

    // If action is "warn" or "remove", trigger confirmed_abuse reputation penalty
    if (action === "warn" || action === "remove") {
      const repUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-reputation`;
      const repHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` };

      // Get the reported user
      const reportedUserId = await getReportedUserId(adminClient, report.entity_type, report.entity_id);
      if (reportedUserId) {
        fetch(repUrl, {
          method: "POST",
          headers: repHeaders,
          body: JSON.stringify({
            user_id: reportedUserId,
            action_key: "confirmed_abuse",
            source_entity_type: report.entity_type,
            source_entity_id: report.entity_id,
          }),
        }).catch(() => {});
      }
    }
  }

  log.info("Moderation action taken", { id, action, by: userId });

  return new Response(JSON.stringify({ data: updated }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Content removal (soft-delete) ──

async function handleContentRemoval(
  adminClient: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string,
  log: ReturnType<typeof createLogger>["log"]
) {
  try {
    if (entityType === "review") {
      await adminClient
        .from("plant_reviews")
        .update({ is_visible: false })
        .eq("id", entityId);
    } else if (entityType === "comment") {
      await adminClient
        .from("review_comments")
        .update({
          deleted_at: new Date().toISOString(),
          body: "[removed by moderator]",
          author_name: "[removed]",
        })
        .eq("id", entityId);
    }
    log.info("Content removed", { entityType, entityId });
  } catch (err) {
    log.warn("Content removal failed", { entityType, entityId, error: String(err) });
  }
}

// ── Get user ID of reported content author ──

async function getReportedUserId(
  adminClient: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string
): Promise<string | null> {
  try {
    if (entityType === "review") {
      const { data } = await adminClient
        .from("plant_reviews")
        .select("user_id")
        .eq("id", entityId)
        .single();
      return data?.user_id ?? null;
    } else if (entityType === "comment") {
      const { data } = await adminClient
        .from("review_comments")
        .select("user_id")
        .eq("id", entityId)
        .single();
      return data?.user_id ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}
