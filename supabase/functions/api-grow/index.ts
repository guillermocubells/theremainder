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
const ENTRY_TYPES = ["observation", "watering", "fertilizing", "pruning", "repotting", "outcome"] as const;

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

const entryCreate = z.object({
  type: z.enum(ENTRY_TYPES).default("observation"),
  occurred_at: z.string().datetime().optional(),
  notes: z.string().max(5000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

const entryUpdate = z.object({
  type: z.enum(ENTRY_TYPES).optional(),
  occurred_at: z.string().datetime().optional(),
  notes: z.string().max(5000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const entryListParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(ENTRY_TYPES).optional(),
});

const germCreate = z.object({
  seed_batch_id: z.string().uuid().nullable().optional(),
  method: z.string().max(100).nullable().optional(),
  medium: z.string().max(100).nullable().optional(),
  temp_c: z.number().min(-20).max(60).nullable().optional(),
  humidity_pct: z.number().min(0).max(100).nullable().optional(),
  light: z.string().max(100).nullable().optional(),
  count_sown: z.number().int().min(0).max(100000).default(0),
  count_germinated: z.number().int().min(0).max(100000).default(0),
  first_sprout_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const germListParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Media constants & schemas
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
] as const;

const mediaUploadRequest = z.object({
  entry_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  mime_type: z.enum(ACCEPTED_MIME_TYPES as unknown as [string, ...string[]]),
  file_size_bytes: z.number().int().min(1).max(MAX_FILE_SIZE),
  width: z.number().int().min(1).max(20000).nullable().optional(),
  height: z.number().int().min(1).max(20000).nullable().optional(),
  sort_order: z.number().int().min(0).max(100).default(0),
});

const mediaListParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const feedParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  taxon_id: z.string().uuid().optional(),
  type: z.enum(ENTRY_TYPES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string, label = "ID") {
  if (!uuidRegex.test(id)) throw new AppError(`Invalid ${label}`, 400, "INVALID_ID");
}

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

function anonClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
}

// ── Route parser ──
interface Route {
  resource?: string; // "logs" or undefined
  logId?: string;
  subResource?: string; // "entries" | "germination"
  subId?: string;
}

function parsePath(url: URL): Route {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: [api-grow, logs?, logId?, entries|germination?, subId?]
  return {
    resource: segments[1],
    logId: segments[2],
    subResource: segments[3],
    subId: segments[4],
  };
}

// ── Log helpers ──
async function verifyLogOwnership(
  supabase: ReturnType<typeof createClient>,
  logId: string,
  userId: string,
): Promise<void> {
  assertUuid(logId, "log ID");
  const { data, error } = await supabase
    .from("grow_logs")
    .select("id")
    .eq("id", logId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new AppError("Log not found or not owned", 404, "LOG_NOT_FOUND");
}

async function verifyLogAccess(
  supabase: ReturnType<typeof createClient>,
  logId: string,
  userId: string | null,
): Promise<void> {
  assertUuid(logId, "log ID");
  const { data } = await supabase.from("grow_logs").select("user_id, visibility").eq("id", logId).single();
  if (!data) throw new AppError("Log not found", 404, "LOG_NOT_FOUND");
  if (data.user_id !== userId && data.visibility === "private") {
    throw new AppError("Log not found", 404, "LOG_NOT_FOUND");
  }
}

// ════════════════════════════════════════
//  LOG HANDLERS
// ════════════════════════════════════════

async function handleListLogs(
  req: Request, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  const qp = Object.fromEntries(new URL(req.url).searchParams);
  const v = validate(listParams, qp, rh);
  if (v.error) return v.error;

  const { page, limit, visibility, species } = v.data;
  const from = (page - 1) * limit;

  let query = supabase.from("grow_logs").select("*", { count: "exact" })
    .eq("user_id", userId).order("created_at", { ascending: false }).range(from, from + limit - 1);
  if (visibility) query = query.eq("visibility", visibility);
  if (species) query = query.ilike("species", `%${species}%`);

  const { data, error, count } = await query;
  if (error) throw new AppError("Failed to list logs", 500, "LIST_FAILED");
  return new Response(JSON.stringify({ data: data ?? [], meta: { page, limit, total: count ?? 0 } }),
    { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleGetLog(
  logId: string, userId: string | null, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  assertUuid(logId, "log ID");
  const { data, error } = await supabase.from("grow_logs").select("*").eq("id", logId).single();
  if (error || !data) throw new AppError("Log not found", 404, "LOG_NOT_FOUND");
  if (data.user_id !== userId && data.visibility === "private") throw new AppError("Log not found", 404, "LOG_NOT_FOUND");
  return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleCreateLog(
  req: Request, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(logCreate, body, rh);
  if (v.error) return v.error;
  if (v.data.taxon_id) {
    const { data: plant } = await supabase.from("plants").select("id").eq("id", v.data.taxon_id).single();
    if (!plant) throw new AppError("Invalid taxon_id: plant not found", 400, "INVALID_TAXON");
  }
  const { data, error } = await supabase.from("grow_logs").insert({ ...v.data, user_id: userId }).select("*").single();
  if (error) throw new AppError("Failed to create log", 500, "CREATE_FAILED");
  log.info("Log created", { id: data.id });
  return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleUpdateLog(
  req: Request, logId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  assertUuid(logId, "log ID");
  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(logUpdate, body, rh);
  if (v.error) return v.error;
  if (Object.keys(v.data).length === 0) throw new AppError("No fields to update", 400, "EMPTY_UPDATE");
  if (v.data.taxon_id) {
    const { data: plant } = await supabase.from("plants").select("id").eq("id", v.data.taxon_id).single();
    if (!plant) throw new AppError("Invalid taxon_id: plant not found", 400, "INVALID_TAXON");
  }
  const { data, error } = await supabase.from("grow_logs").update(v.data).eq("id", logId).eq("user_id", userId).select("*").single();
  if (error || !data) throw new AppError("Log not found or not owned", 404, "LOG_NOT_FOUND");
  log.info("Log updated", { id: logId });
  return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleDeleteLog(
  logId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  assertUuid(logId, "log ID");
  const { error, count } = await supabase.from("grow_logs").delete({ count: "exact" }).eq("id", logId).eq("user_id", userId);
  if (error) throw new AppError("Failed to delete log", 500, "DELETE_FAILED");
  if (count === 0) throw new AppError("Log not found or not owned", 404, "LOG_NOT_FOUND");
  log.info("Log deleted", { id: logId });
  return new Response(null, { status: 204, headers: rh });
}

// ════════════════════════════════════════
//  ENTRY HANDLERS
// ════════════════════════════════════════

async function handleListEntries(
  req: Request, logId: string, userId: string | null, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  await verifyLogAccess(supabase, logId, userId);
  const qp = Object.fromEntries(new URL(req.url).searchParams);
  const v = validate(entryListParams, qp, rh);
  if (v.error) return v.error;
  const { page, limit, type } = v.data;
  const from = (page - 1) * limit;
  let query = supabase.from("grow_entries").select("*", { count: "exact" }).eq("log_id", logId)
    .order("occurred_at", { ascending: false }).range(from, from + limit - 1);
  if (type) query = query.eq("type", type);
  const { data, error, count } = await query;
  if (error) throw new AppError("Failed to list entries", 500, "LIST_FAILED");
  return new Response(JSON.stringify({ data: data ?? [], meta: { page, limit, total: count ?? 0 } }),
    { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleCreateEntry(
  req: Request, logId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  await verifyLogOwnership(supabase, logId, userId);
  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(entryCreate, body, rh);
  if (v.error) return v.error;
  const { data, error } = await supabase.from("grow_entries").insert({
    log_id: logId, user_id: userId, type: v.data.type,
    occurred_at: v.data.occurred_at ?? new Date().toISOString(),
    notes: v.data.notes ?? null, rating: v.data.rating ?? null, tags: v.data.tags,
  }).select("*").single();
  if (error) throw new AppError("Failed to create entry", 500, "CREATE_FAILED");
  log.info("Entry created", { id: data.id, logId });
  return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleUpdateEntry(
  req: Request, logId: string, entryId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  assertUuid(logId, "log ID"); assertUuid(entryId, "entry ID");
  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(entryUpdate, body, rh);
  if (v.error) return v.error;
  if (Object.keys(v.data).length === 0) throw new AppError("No fields to update", 400, "EMPTY_UPDATE");
  const { data, error } = await supabase.from("grow_entries")
    .update({ ...v.data, updated_at: new Date().toISOString() })
    .eq("id", entryId).eq("log_id", logId).eq("user_id", userId).select("*").single();
  if (error || !data) throw new AppError("Entry not found or not owned", 404, "ENTRY_NOT_FOUND");
  log.info("Entry updated", { id: entryId, logId });
  return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleDeleteEntry(
  logId: string, entryId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  assertUuid(logId, "log ID"); assertUuid(entryId, "entry ID");
  const { error, count } = await supabase.from("grow_entries").delete({ count: "exact" })
    .eq("id", entryId).eq("log_id", logId).eq("user_id", userId);
  if (error) throw new AppError("Failed to delete entry", 500, "DELETE_FAILED");
  if (count === 0) throw new AppError("Entry not found or not owned", 404, "ENTRY_NOT_FOUND");
  log.info("Entry deleted", { id: entryId, logId });
  return new Response(null, { status: 204, headers: rh });
}

// ════════════════════════════════════════
//  GERMINATION HANDLERS
// ════════════════════════════════════════

interface GermRow {
  id: string;
  count_sown: number;
  count_germinated: number;
  first_sprout_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

function withComputed(row: GermRow) {
  const germination_rate = row.count_sown > 0
    ? Math.round((row.count_germinated / row.count_sown) * 10000) / 100
    : null;

  let days_to_first_sprout: number | null = null;
  if (row.first_sprout_at && row.created_at) {
    const diff = new Date(row.first_sprout_at).getTime() - new Date(row.created_at).getTime();
    days_to_first_sprout = Math.max(0, Math.round(diff / 86_400_000));
  }

  return { ...row, germination_rate, days_to_first_sprout };
}

async function handleListGermination(
  req: Request, logId: string, userId: string | null, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  await verifyLogAccess(supabase, logId, userId);
  const qp = Object.fromEntries(new URL(req.url).searchParams);
  const v = validate(germListParams, qp, rh);
  if (v.error) return v.error;
  const { page, limit } = v.data;
  const from = (page - 1) * limit;

  const { data, error, count } = await supabase.from("germination_events")
    .select("*", { count: "exact" }).eq("log_id", logId)
    .order("created_at", { ascending: false }).range(from, from + limit - 1);
  if (error) throw new AppError("Failed to list germination events", 500, "LIST_FAILED");

  const enriched = (data ?? []).map((r: GermRow) => withComputed(r));
  return new Response(JSON.stringify({ data: enriched, meta: { page, limit, total: count ?? 0 } }),
    { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleCreateGermination(
  req: Request, logId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  await verifyLogOwnership(supabase, logId, userId);
  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(germCreate, body, rh);
  if (v.error) return v.error;

  // Validate count_germinated <= count_sown
  if (v.data.count_germinated > v.data.count_sown) {
    throw new AppError("count_germinated cannot exceed count_sown", 400, "INVALID_COUNTS");
  }

  const { data, error } = await supabase.from("germination_events").insert({
    log_id: logId, user_id: userId, ...v.data,
  }).select("*").single();
  if (error) throw new AppError("Failed to create germination event", 500, "CREATE_FAILED");

  log.info("Germination event created", { id: data.id, logId });
  return new Response(JSON.stringify(withComputed(data as GermRow)), {
    status: 201, headers: { ...rh, "Content-Type": "application/json" },
  });
}

// ════════════════════════════════════════
//  MEDIA HANDLERS
// ════════════════════════════════════════

function buildPublicUrl(storagePath: string): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  return `${base}/storage/v1/object/public/grow-media/${storagePath}`;
}

async function handleCreateUpload(
  req: Request, logId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  await verifyLogOwnership(supabase, logId, userId);

  let body: unknown;
  try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
  const v = validate(mediaUploadRequest, body, rh);
  if (v.error) return v.error;

  // Verify entry belongs to this log
  const { data: entry } = await supabase.from("grow_entries")
    .select("id").eq("id", v.data.entry_id).eq("log_id", logId).single();
  if (!entry) throw new AppError("Entry not found in this log", 404, "ENTRY_NOT_FOUND");

  // Build storage path: {userId}/{logId}/{entryId}/{uuid}-{fileName}
  const fileId = crypto.randomUUID();
  const sanitized = v.data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${logId}/${v.data.entry_id}/${fileId}-${sanitized}`;

  // Create signed upload URL
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: signedData, error: signError } = await adminClient.storage
    .from("grow-media")
    .createSignedUploadUrl(storagePath);

  if (signError || !signedData) {
    throw new AppError("Failed to create upload URL", 500, "UPLOAD_URL_FAILED");
  }

  // Insert media record (pending until client confirms upload)
  const { data: media, error: insertErr } = await supabase.from("grow_entry_media").insert({
    entry_id: v.data.entry_id,
    log_id: logId,
    user_id: userId,
    storage_path: storagePath,
    file_name: v.data.file_name,
    mime_type: v.data.mime_type,
    file_size_bytes: v.data.file_size_bytes,
    width: v.data.width ?? null,
    height: v.data.height ?? null,
    sort_order: v.data.sort_order,
  }).select("*").single();

  if (insertErr || !media) throw new AppError("Failed to record media", 500, "CREATE_FAILED");

  log.info("Media upload initiated", { id: media.id, logId, entryId: v.data.entry_id });

  return new Response(JSON.stringify({
    id: media.id,
    signed_upload_url: signedData.signedUrl,
    upload_token: signedData.token,
    storage_path: storagePath,
    public_url: buildPublicUrl(storagePath),
    expires_in: 120,
    constraints: {
      max_size_bytes: MAX_FILE_SIZE,
      accepted_types: ACCEPTED_MIME_TYPES,
    },
  }), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleListMedia(
  req: Request, logId: string, userId: string | null, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  await verifyLogAccess(supabase, logId, userId);

  const qp = Object.fromEntries(new URL(req.url).searchParams);
  const v = validate(mediaListParams, qp, rh);
  if (v.error) return v.error;

  const entryId = new URL(req.url).searchParams.get("entry_id");
  const { page, limit } = v.data;
  const from = (page - 1) * limit;

  let query = supabase.from("grow_entry_media").select("*", { count: "exact" })
    .eq("log_id", logId).order("sort_order", { ascending: true }).range(from, from + limit - 1);
  if (entryId) {
    assertUuid(entryId, "entry_id");
    query = query.eq("entry_id", entryId);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError("Failed to list media", 500, "LIST_FAILED");

  const enriched = (data ?? []).map((m: any) => ({
    ...m,
    public_url: buildPublicUrl(m.storage_path),
  }));

  return new Response(JSON.stringify({ data: enriched, meta: { page, limit, total: count ?? 0 } }),
    { headers: { ...rh, "Content-Type": "application/json" } });
}

async function handleDeleteMedia(
  logId: string, mediaId: string, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>, log: any,
): Promise<Response> {
  assertUuid(logId, "log ID");
  assertUuid(mediaId, "media ID");

  // Get the media record to find storage path
  const { data: media } = await supabase.from("grow_entry_media")
    .select("storage_path").eq("id", mediaId).eq("log_id", logId).eq("user_id", userId).single();
  if (!media) throw new AppError("Media not found or not owned", 404, "MEDIA_NOT_FOUND");

  // Delete from storage
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await adminClient.storage.from("grow-media").remove([media.storage_path]);

  // Delete DB record
  const { error } = await supabase.from("grow_entry_media").delete()
    .eq("id", mediaId).eq("user_id", userId);
  if (error) throw new AppError("Failed to delete media", 500, "DELETE_FAILED");

  log.info("Media deleted", { id: mediaId, logId });
  return new Response(null, { status: 204, headers: rh });
}

// ════════════════════════════════════════
//  FEED / TIMELINE HANDLER
// ════════════════════════════════════════

function buildPublicMediaUrl(storagePath: string): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  return `${base}/storage/v1/object/public/grow-media/${storagePath}`;
}

async function handleFeed(
  req: Request, userId: string, supabase: ReturnType<typeof createClient>, rh: Record<string, string>,
): Promise<Response> {
  const qp = Object.fromEntries(new URL(req.url).searchParams);
  const v = validate(feedParams, qp, rh);
  if (v.error) return v.error;

  const { page, limit, taxon_id, type, from, to } = v.data;
  const offset = (page - 1) * limit;

  // Build entries query with joined log data
  let query = supabase
    .from("grow_entries")
    .select(`
      id, type, occurred_at, notes, rating, tags, created_at, updated_at,
      log_id,
      grow_logs!inner ( id, title, species, taxon_id, visibility, user_id )
    `, { count: "exact" })
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (taxon_id) query = query.eq("grow_logs.taxon_id", taxon_id);
  if (type) query = query.eq("type", type);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);

  const { data: entries, error, count } = await query;
  if (error) throw new AppError("Failed to fetch feed", 500, "FEED_FAILED");

  if (!entries || entries.length === 0) {
    return new Response(JSON.stringify({ data: [], meta: { page, limit, total: 0 } }),
      { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // Batch-fetch latest photos for returned entries
  const entryIds = entries.map((e: any) => e.id);
  const { data: mediaRows } = await supabase
    .from("grow_entry_media")
    .select("id, entry_id, storage_path, mime_type, width, height, sort_order")
    .in("entry_id", entryIds)
    .order("sort_order", { ascending: true })
    .limit(200);

  // Group media by entry, keep max 3 per entry
  const mediaByEntry: Record<string, any[]> = {};
  for (const m of mediaRows ?? []) {
    const eid = m.entry_id as string;
    if (!mediaByEntry[eid]) mediaByEntry[eid] = [];
    if (mediaByEntry[eid].length < 3) {
      mediaByEntry[eid].push({
        id: m.id,
        url: buildPublicMediaUrl(m.storage_path),
        mime_type: m.mime_type,
        width: m.width,
        height: m.height,
      });
    }
  }

  // Shape response
  const feed = entries.map((e: any) => {
    const log = e.grow_logs;
    const snippet = e.notes
      ? e.notes.length > 280 ? e.notes.slice(0, 277) + "…" : e.notes
      : null;

    return {
      id: e.id,
      type: e.type,
      occurred_at: e.occurred_at,
      rating: e.rating,
      tags: e.tags,
      notes_snippet: snippet,
      created_at: e.created_at,
      log: {
        id: log.id,
        title: log.title,
        species: log.species,
        taxon_id: log.taxon_id,
      },
      photos: mediaByEntry[e.id] ?? [],
    };
  });

  return new Response(JSON.stringify({ data: feed, meta: { page, limit, total: count ?? 0 } }),
    { headers: { ...rh, "Content-Type": "application/json" } });
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
    const sub = route.subResource;

    // ── Helper: optional auth for public reads ──
    const optionalAuth = async () => {
      const auth = await authenticateRequest(req);
      return {
        userId: auth.error ? null : auth.userId!,
        client: auth.error ? anonClient() : auth.supabase!,
      };
    };

    // ── Helper: required auth ──
    const requireAuth = async () => {
      const auth = await authenticateRequest(req);
      if (auth.error) throw new AppError(auth.error, 401, "UNAUTHORIZED");
      return { userId: auth.userId!, supabase: auth.supabase! };
    };

    // ════════════════════════════════
    //  PUBLIC GETs (visibility-gated)
    // ════════════════════════════════
    if (req.method === "GET") {
      if (route.logId && !sub) {
        const { userId, client } = await optionalAuth();
        return await handleGetLog(route.logId, userId, client, rh);
      }
      if (route.logId && sub === "entries" && !route.subId) {
        const { userId, client } = await optionalAuth();
        return await handleListEntries(req, route.logId, userId, client, rh);
      }
      if (route.logId && sub === "germination" && !route.subId) {
        const { userId, client } = await optionalAuth();
        return await handleListGermination(req, route.logId, userId, client, rh);
      }
      if (route.logId && sub === "media" && !route.subId) {
        const { userId, client } = await optionalAuth();
        return await handleListMedia(req, route.logId, userId, client, rh);
      }
    }

    // ════════════════════════════════
    //  AUTHENTICATED ROUTES
    // ════════════════════════════════
    const { userId, supabase } = await requireAuth();

    // FEED route: GET /feed (no logId)
    if (req.method === "GET" && route.resource === "feed" && !route.logId) {
      return await handleFeed(req, userId, supabase, rh);
    }

    // AGGREGATES routes
    if (req.method === "GET" && route.resource === "stats") {
      // GET /stats — user-level aggregates
      if (!route.logId) {
        const { data, error } = await supabase.rpc("grow_user_aggregates", { p_user_id: userId });
        if (error) throw new AppError("Failed to compute aggregates", 500, "STATS_FAILED");
        return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
      }
      // GET /stats/:logId — single log stats
      assertUuid(route.logId, "log ID");
      const { data, error } = await supabase.rpc("grow_log_stats", { p_log_id: route.logId, p_user_id: userId });
      if (error || !data) throw new AppError("Log not found or stats unavailable", 404, "STATS_NOT_FOUND");
      return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
    }

    // LOG routes
    if (!sub) {
      if (req.method === "GET" && !route.logId) return await handleListLogs(req, userId, supabase, rh);
      if (req.method === "POST" && !route.logId) return await handleCreateLog(req, userId, supabase, rh, log);
      if (req.method === "PATCH" && route.logId) return await handleUpdateLog(req, route.logId, userId, supabase, rh, log);
      if (req.method === "DELETE" && route.logId) return await handleDeleteLog(route.logId, userId, supabase, rh, log);
    }

    // ENTRY routes
    if (sub === "entries" && route.logId) {
      if (req.method === "POST" && !route.subId) return await handleCreateEntry(req, route.logId, userId, supabase, rh, log);
      if (req.method === "PATCH" && route.subId) return await handleUpdateEntry(req, route.logId, route.subId, userId, supabase, rh, log);
      if (req.method === "DELETE" && route.subId) return await handleDeleteEntry(route.logId, route.subId, userId, supabase, rh, log);
    }

    // GERMINATION routes
    if (sub === "germination" && route.logId) {
      if (req.method === "POST" && !route.subId) return await handleCreateGermination(req, route.logId, userId, supabase, rh, log);
    }

    // MEDIA routes
    if (sub === "media" && route.logId) {
      if (req.method === "POST" && !route.subId) return await handleCreateUpload(req, route.logId, userId, supabase, rh, log);
      if (req.method === "DELETE" && route.subId) return await handleDeleteMedia(route.logId, route.subId, userId, supabase, rh, log);
    }

    throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rh, requestId, log);
  }
});
