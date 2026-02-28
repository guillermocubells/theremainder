/**
 * api-comments – Threaded comment CRUD for plant reviews
 *
 * GET    ?review_id=<uuid>&page=1&limit=20&sort=new|old  → paginated list (public)
 * POST   { review_id, parent_id?, author_name, body }    → create comment / reply
 * PATCH  { id, body }                                    → edit own comment
 * DELETE { id }                                           → soft-delete own comment
 *
 * Features:
 *  - Threading via parent_id (max depth 3 enforced by DB)
 *  - Markdown sanitization (strip HTML, limit length)
 *  - Rate-limited writes (form_submit preset)
 *  - Soft-delete preserves thread structure
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";
import { validate, z, schemas } from "../_shared/validation.ts";
import { checkRateLimit, PRESETS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// ── Schemas ──

const listSchema = z.object({
  review_id: schemas.uuid,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["new", "old"]).default("new"),
});

const createSchema = z.object({
  review_id: schemas.uuid,
  parent_id: schemas.uuid.nullable().optional(),
  author_name: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(2000),
});

const updateSchema = z.object({
  id: schemas.uuid,
  body: z.string().trim().min(1).max(2000),
});

const deleteSchema = z.object({
  id: schemas.uuid,
});

// ── Sanitize body: strip HTML tags, collapse whitespace ──

function sanitizeBody(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")           // strip HTML
    .replace(/\r\n/g, "\n")            // normalize line breaks
    .replace(/\n{3,}/g, "\n\n")        // max 2 consecutive newlines
    .trim();
}

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-comments", req);
  const rHeaders = withCorrelationId(corsHeaders, requestId);

  try {
    // GET is public; others need auth
    if (req.method === "GET") {
      return await handleList(req, rHeaders, log);
    }

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
    const rl = checkRateLimit(req, PRESETS.form_submit, userId);
    if (!rl.allowed) {
      log.warn("Rate limited", { key: rl.key });
      return rateLimitResponse(rl.headers, rHeaders);
    }

    if (req.method === "POST") return await handleCreate(req, supabase, userId, rHeaders, rl.headers, log);
    if (req.method === "PATCH") return await handleUpdate(req, supabase, userId, rHeaders, rl.headers, log);
    if (req.method === "DELETE") return await handleDelete(req, supabase, userId, rHeaders, rl.headers, log);

    throw new AppError(`Method ${req.method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rHeaders, requestId, log);
  }
});

// ── GET: List comments for a review (paginated) ──

async function handleList(
  req: Request,
  cors: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = validate(listSchema, params, cors);
  if (parsed.error) return parsed.error;
  const { review_id, page, limit, sort } = parsed.data;

  // Public client (anon key only)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const ascending = sort === "old";
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count
  const { count } = await supabase
    .from("review_comments")
    .select("id", { count: "exact", head: true })
    .eq("review_id", review_id)
    .is("deleted_at", null);

  // Get page
  const { data, error } = await supabase
    .from("review_comments")
    .select("id, review_id, parent_id, user_id, author_name, body, is_edited, depth, created_at, updated_at, deleted_at")
    .eq("review_id", review_id)
    .is("deleted_at", null)
    .order("created_at", { ascending })
    .range(from, to);

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  // For soft-deleted comments with replies, return placeholder
  const { data: deletedWithReplies } = await supabase
    .from("review_comments")
    .select("id, review_id, parent_id, depth, created_at, updated_at, deleted_at")
    .eq("review_id", review_id)
    .not("deleted_at", "is", null);

  // Merge: deleted parents that have children in `data` need to appear as "[deleted]"
  const activeIds = new Set((data ?? []).map((c: { parent_id: string | null }) => c.parent_id).filter(Boolean));
  const deletedPlaceholders = (deletedWithReplies ?? [])
    .filter((d: { id: string }) => activeIds.has(d.id))
    .map((d: Record<string, unknown>) => ({
      ...d,
      author_name: "[deleted]",
      body: "[This comment has been removed]",
      is_edited: false,
      user_id: null,
    }));

  const merged = [...(data ?? []), ...deletedPlaceholders];

  log.info("Comments listed", { review_id, page, count });

  return new Response(
    JSON.stringify({
      data: merged,
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

// ── POST: Create comment / reply ──

async function handleCreate(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cors: Record<string, string>,
  rlHeaders: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(createSchema, body, cors);
  if (parsed.error) return parsed.error;

  const { review_id, parent_id, author_name } = parsed.data;
  const sanitizedBody = sanitizeBody(parsed.data.body);
  if (!sanitizedBody) throw new AppError("Comment body cannot be empty after sanitization", 422, "VALIDATION_ERROR");

  // Verify review exists
  const { count: reviewCount } = await supabase
    .from("plant_reviews")
    .select("id", { count: "exact", head: true })
    .eq("id", review_id);

  if (!reviewCount) throw new AppError("Review not found", 404, "NOT_FOUND");

  // If replying, verify parent exists and is not deleted
  if (parent_id) {
    const { data: parent } = await supabase
      .from("review_comments")
      .select("id, depth, deleted_at")
      .eq("id", parent_id)
      .single();

    if (!parent) throw new AppError("Parent comment not found", 404, "NOT_FOUND");
    if (parent.deleted_at) throw new AppError("Cannot reply to a deleted comment", 422, "VALIDATION_ERROR");
    if (parent.depth >= 3) throw new AppError("Maximum nesting depth reached", 422, "MAX_DEPTH");
  }

  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      review_id,
      parent_id: parent_id ?? null,
      user_id: userId,
      author_name,
      body: sanitizedBody,
    })
    .select()
    .single();

  if (error) {
    if (error.message?.includes("review_comments_max_depth")) {
      throw new AppError("Maximum nesting depth reached", 422, "MAX_DEPTH");
    }
    throw new AppError(error.message, 500, "DB_ERROR");
  }

  log.info("Comment created", { id: data.id, review_id, parent_id });

  // ── Fire-and-forget notifications ──
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey) {
    const { emitNotification } = await import("../_shared/notify.ts");
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Notify review author about new comment
    const { data: review } = await supabase
      .from("plant_reviews")
      .select("user_id")
      .eq("id", review_id)
      .single();

    if (review?.user_id && review.user_id !== userId) {
      emitNotification(adminClient, {
        userId: review.user_id,
        eventType: "new_comment",
        payload: { review_id, comment_id: data.id, commenter_name: author_name },
        email: { subject: "New comment on your review", template: "new_comment" },
      }).catch(() => {});
    }

    // If replying, notify the parent comment author
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from("review_comments")
        .select("user_id")
        .eq("id", parent_id)
        .single();

      if (parentComment?.user_id && parentComment.user_id !== userId && parentComment.user_id !== review?.user_id) {
        emitNotification(adminClient, {
          userId: parentComment.user_id,
          eventType: "comment_reply",
          payload: { review_id, parent_id, comment_id: data.id, commenter_name: author_name },
          email: { subject: "Someone replied to your comment", template: "comment_reply" },
        }).catch(() => {});
      }
    }
  }

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...cors, ...rlHeaders, "Content-Type": "application/json" },
  });
}

// ── PATCH: Edit own comment ──

async function handleUpdate(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cors: Record<string, string>,
  rlHeaders: Record<string, string>,
  log: ReturnType<typeof createLogger>["log"]
) {
  const body = await req.json().catch(() => null);
  if (!body) throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");

  const parsed = validate(updateSchema, body, cors);
  if (parsed.error) return parsed.error;

  const sanitizedBody = sanitizeBody(parsed.data.body);
  if (!sanitizedBody) throw new AppError("Comment body cannot be empty after sanitization", 422, "VALIDATION_ERROR");

  // Verify ownership and not deleted
  const { data: existing } = await supabase
    .from("review_comments")
    .select("id, user_id, deleted_at")
    .eq("id", parsed.data.id)
    .single();

  if (!existing) throw new AppError("Comment not found", 404, "NOT_FOUND");
  if (existing.deleted_at) throw new AppError("Cannot edit a deleted comment", 422, "VALIDATION_ERROR");
  if (existing.user_id !== userId) throw new AppError("Not authorized to edit this comment", 403, "FORBIDDEN");

  const { data, error } = await supabase
    .from("review_comments")
    .update({ body: sanitizedBody, is_edited: true, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Comment updated", { id: parsed.data.id });

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...cors, ...rlHeaders, "Content-Type": "application/json" },
  });
}

// ── DELETE: Soft-delete own comment ──

async function handleDelete(
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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    body = id ? { id } : null;
  }

  if (!body) throw new AppError("Missing comment id", 400, "BAD_REQUEST");

  const parsed = validate(deleteSchema, body, cors);
  if (parsed.error) return parsed.error;

  // Verify ownership
  const { data: existing } = await supabase
    .from("review_comments")
    .select("id, user_id, deleted_at")
    .eq("id", parsed.data.id)
    .single();

  if (!existing) throw new AppError("Comment not found", 404, "NOT_FOUND");
  if (existing.deleted_at) throw new AppError("Comment already deleted", 422, "ALREADY_DELETED");
  if (existing.user_id !== userId) throw new AppError("Not authorized to delete this comment", 403, "FORBIDDEN");

  // Soft-delete: set deleted_at, clear body for privacy
  const { error } = await supabase
    .from("review_comments")
    .update({
      deleted_at: new Date().toISOString(),
      body: "[deleted]",
      author_name: "[deleted]",
    })
    .eq("id", parsed.data.id);

  if (error) throw new AppError(error.message, 500, "DB_ERROR");

  log.info("Comment soft-deleted", { id: parsed.data.id });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, ...rlHeaders, "Content-Type": "application/json" },
  });
}
