import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse, PRESETS, extractUserIdFromJwt } from "../_shared/rate-limit.ts";
import { validate, z } from "../_shared/validation.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";

// ── CORS ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// ── Validation schemas ──
const collectionCreate = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  cover_image_url: z.string().url().max(2000).nullable().optional(),
});

const collectionUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  cover_image_url: z.string().url().max(2000).nullable().optional(),
});

const paginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_asc", "created_desc", "name_asc", "name_desc", "updated_desc"]).default("created_desc"),
  include_archived: z.coerce.boolean().default(false),
});

// ── Auth helper ──
async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    return { error: "Unauthorized" };
  }

  return { userId: data.claims.sub as string, supabase };
}

// ── Sort helper ──
function applySortOrder(query: any, sort: string) {
  switch (sort) {
    case "created_asc":
      return query.order("created_at", { ascending: true });
    case "name_asc":
      return query.order("name", { ascending: true });
    case "name_desc":
      return query.order("name", { ascending: false });
    case "updated_desc":
      return query.order("updated_at", { ascending: false });
    case "created_desc":
    default:
      return query.order("created_at", { ascending: false });
  }
}

// ── Route parser ──
function parsePath(url: URL): { resource: string; id?: string } {
  // Path is like /api-collection/collections or /api-collection/collections/:id
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: ["api-collection", "collections", ...id]
  const resource = segments[1] ?? "";
  const id = segments[2];
  return { resource, id };
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-collection", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const jwtUserId = extractUserIdFromJwt(req.headers.get("Authorization"));
  const rl = checkRateLimit(req, PRESETS.auth_write, jwtUserId);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      throw new AppError(auth.error, 401, "UNAUTHORIZED");
    }
    const { userId, supabase } = auth;

    const url = new URL(req.url);
    const { resource, id } = parsePath(url);

    if (resource !== "collections") {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    // ────────── LIST ──────────
    if (req.method === "GET" && !id) {
      const qp = Object.fromEntries(url.searchParams);
      const pv = validate(paginationParams, qp, rh);
      if (pv.error) return pv.error;

      const { page, page_size, sort, include_archived } = pv.data;
      const from = (page - 1) * page_size;
      const to = from + page_size - 1;

      let query = supabase
        .from("collections")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      if (!include_archived) {
        query = query.is("deleted_at", null);
      }

      query = applySortOrder(query, sort);
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        log.error("List collections error", { error: error.message });
        throw new AppError("Failed to list collections", 500, "LIST_FAILED");
      }

      return new Response(
        JSON.stringify({
          data,
          total: count ?? 0,
          page,
          page_size,
          has_more: (count ?? 0) > from + page_size,
        }),
        { headers: { ...rh, "Content-Type": "application/json" } },
      );
    }

    // ────────── GET by ID ──────────
    if (req.method === "GET" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");

      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      }

      return new Response(JSON.stringify(data), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

    // ────────── CREATE ──────────
    if (req.method === "POST" && !id) {
      let body: unknown;
      try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

      const v = validate(collectionCreate, body, rh);
      if (v.error) return v.error;

      const { data, error } = await supabase
        .from("collections")
        .insert({ ...v.data, user_id: userId })
        .select("*")
        .single();

      if (error) {
        log.error("Create collection error", { error: error.message });
        throw new AppError("Failed to create collection", 500, "CREATE_FAILED");
      }

      log.info("Collection created", { id: data.id, user_id: userId });

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

    // ────────── UPDATE ──────────
    if (req.method === "PATCH" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");

      let body: unknown;
      try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

      const v = validate(collectionUpdate, body, rh);
      if (v.error) return v.error;

      // Prevent updating default collection name
      const { data: existing } = await supabase
        .from("collections")
        .select("is_default")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      }

      if (existing.is_default && v.data.name) {
        throw new AppError("Cannot rename the default collection", 400, "DEFAULT_RENAME_BLOCKED");
      }

      const { data, error } = await supabase
        .from("collections")
        .update(v.data)
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("*")
        .single();

      if (error || !data) {
        throw new AppError("Failed to update collection", 500, "UPDATE_FAILED");
      }

      log.info("Collection updated", { id, user_id: userId });

      return new Response(JSON.stringify(data), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

    // ────────── ARCHIVE (soft delete) ──────────
    if (req.method === "DELETE" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");

      // Block deletion of default collection
      const { data: existing } = await supabase
        .from("collections")
        .select("is_default")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      }

      if (existing.is_default) {
        throw new AppError("Cannot archive the default collection", 400, "DEFAULT_DELETE_BLOCKED");
      }

      const { error } = await supabase
        .from("collections")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null);

      if (error) {
        throw new AppError("Failed to archive collection", 500, "ARCHIVE_FAILED");
      }

      log.info("Collection archived", { id, user_id: userId });

      return new Response(null, { status: 204, headers: rh });
    }

    throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rh, requestId, log);
  }
});
