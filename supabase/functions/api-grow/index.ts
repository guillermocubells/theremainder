import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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
const logCreate = z.object({
  title: z.string().trim().min(1).max(200),
  species: z.string().max(200).nullable().optional(),
  taxon_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "link", "public"]).default("private"),
});

const logUpdate = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  species: z.string().max(200).nullable().optional(),
  taxon_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "link", "public"]).optional(),
});

const listParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  visibility: z.enum(["private", "link", "public"]).optional(),
  species: z.string().max(200).optional(),
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ── Route parser ──
interface Route {
  logId?: string;
}

function parsePath(url: URL): Route {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments[0] = "api-grow", segments[1] = "logs", segments[2] = logId
  return { logId: segments[2] };
}

// ── Handlers ──

async function handleListLogs(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  rh: Record<string, string>,
): Promise<Response> {
  const url = new URL(req.url);
  const qp = Object.fromEntries(url.searchParams);
  const v = validate(listParams, qp, rh);
  if (v.error) return v.error;

  const { page, limit, visibility, species } = v.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("grow_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (visibility) {
    query = query.eq("visibility", visibility);
  }
  if (species) {
    query = query.ilike("species", `%${species}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError("Failed to list logs", 500, "LIST_FAILED");

  return new Response(
    JSON.stringify({
      data: data ?? [],
      meta: { page, limit, total: count ?? 0 },
    }),
    { headers: { ...rh, "Content-Type": "application/json" } },
  );
}

async function handleGetLog(
  logId: string,
  userId: string | null,
  supabase: ReturnType<typeof createClient>,
  rh: Record<string, string>,
): Promise<Response> {
  if (!uuidRegex.test(logId)) throw new AppError("Invalid log ID", 400, "INVALID_ID");

  const { data, error } = await supabase
    .from("grow_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (error || !data) throw new AppError("Log not found", 404, "LOG_NOT_FOUND");

  // Ownership or visibility check
  if (data.user_id !== userId && data.visibility === "private") {
    throw new AppError("Log not found", 404, "LOG_NOT_FOUND");
  }

  return new Response(JSON.stringify(data), {
    headers: { ...rh, "Content-Type": "application/json" },
  });
}

async function handleCreateLog(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  rh: Record<string, string>,
  log: any,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("Invalid JSON", 400, "INVALID_JSON");
  }

  const v = validate(logCreate, body, rh);
  if (v.error) return v.error;

  // If taxon_id provided, verify it exists in plants
  if (v.data.taxon_id) {
    const { data: plant } = await supabase
      .from("plants")
      .select("id")
      .eq("id", v.data.taxon_id)
      .single();
    if (!plant) throw new AppError("Invalid taxon_id: plant not found", 400, "INVALID_TAXON");
  }

  const { data, error } = await supabase
    .from("grow_logs")
    .insert({ ...v.data, user_id: userId })
    .select("*")
    .single();

  if (error) throw new AppError("Failed to create log", 500, "CREATE_FAILED");

  log.info("Log created", { id: data.id });
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...rh, "Content-Type": "application/json" },
  });
}

async function handleUpdateLog(
  req: Request,
  logId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  rh: Record<string, string>,
  log: any,
): Promise<Response> {
  if (!uuidRegex.test(logId)) throw new AppError("Invalid log ID", 400, "INVALID_ID");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("Invalid JSON", 400, "INVALID_JSON");
  }

  const v = validate(logUpdate, body, rh);
  if (v.error) return v.error;

  if (Object.keys(v.data).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_UPDATE");
  }

  // Validate taxon_id if provided
  if (v.data.taxon_id) {
    const { data: plant } = await supabase
      .from("plants")
      .select("id")
      .eq("id", v.data.taxon_id)
      .single();
    if (!plant) throw new AppError("Invalid taxon_id: plant not found", 400, "INVALID_TAXON");
  }

  const { data, error } = await supabase
    .from("grow_logs")
    .update(v.data)
    .eq("id", logId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new AppError("Log not found or not owned", 404, "LOG_NOT_FOUND");

  log.info("Log updated", { id: logId });
  return new Response(JSON.stringify(data), {
    headers: { ...rh, "Content-Type": "application/json" },
  });
}

async function handleDeleteLog(
  logId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  rh: Record<string, string>,
  log: any,
): Promise<Response> {
  if (!uuidRegex.test(logId)) throw new AppError("Invalid log ID", 400, "INVALID_ID");

  const { error, count } = await supabase
    .from("grow_logs")
    .delete({ count: "exact" })
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) throw new AppError("Failed to delete log", 500, "DELETE_FAILED");
  if (count === 0) throw new AppError("Log not found or not owned", 404, "LOG_NOT_FOUND");

  log.info("Log deleted", { id: logId });
  return new Response(null, { status: 204, headers: rh });
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-grow", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  try {
    const url = new URL(req.url);
    const route = parsePath(url);

    // Public GET for a specific log (visibility-gated)
    if (req.method === "GET" && route.logId) {
      // Try to authenticate but allow unauthenticated for public logs
      const auth = await authenticateRequest(req);
      const userId = auth.error ? null : auth.userId!;
      const client = auth.error
        ? createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
        : auth.supabase!;
      return await handleGetLog(route.logId, userId, client, rh);
    }

    // All other routes require authentication
    const auth = await authenticateRequest(req);
    if (auth.error) {
      throw new AppError(auth.error, 401, "UNAUTHORIZED");
    }
    const { userId, supabase } = auth;

    // LIST logs
    if (req.method === "GET" && !route.logId) {
      return await handleListLogs(req, userId!, supabase!, rh);
    }

    // CREATE log
    if (req.method === "POST" && !route.logId) {
      return await handleCreateLog(req, userId!, supabase!, rh, log);
    }

    // UPDATE log
    if (req.method === "PATCH" && route.logId) {
      return await handleUpdateLog(req, route.logId, userId!, supabase!, rh, log);
    }

    // DELETE log
    if (req.method === "DELETE" && route.logId) {
      return await handleDeleteLog(route.logId, userId!, supabase!, rh, log);
    }

    throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rh, requestId, log);
  }
});
