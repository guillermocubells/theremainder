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

const itemCreate = z.object({
  owned_plant_id: z.string().uuid(),
  sort_order: z.number().int().min(0).default(0),
  notes: z.string().max(1000).nullable().optional(),
});

const itemUpdate = z.object({
  sort_order: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const itemPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["added_asc", "added_desc", "sort_order", "name_asc"]).default("sort_order"),
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

// Service-role client for storage operations
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Sort helpers ──
function applyCollectionSort(query: any, sort: string) {
  switch (sort) {
    case "created_asc": return query.order("created_at", { ascending: true });
    case "name_asc": return query.order("name", { ascending: true });
    case "name_desc": return query.order("name", { ascending: false });
    case "updated_desc": return query.order("updated_at", { ascending: false });
    default: return query.order("created_at", { ascending: false });
  }
}

function applyItemSort(query: any, sort: string) {
  switch (sort) {
    case "added_asc": return query.order("added_at", { ascending: true });
    case "added_desc": return query.order("added_at", { ascending: false });
    case "name_asc": return query.order("owned_plant_id", { ascending: true }); // best proxy
    case "sort_order":
    default: return query.order("sort_order", { ascending: true }).order("added_at", { ascending: false });
  }
}

// ── Route parser ──
// Supports:
//   /collections, /collections/:id
//   /collections/:collId/items, /collections/:collId/items/:itemId
//   /collections/:collId/items/:itemId/media, /collections/:collId/items/:itemId/media/:mediaId
interface Route {
  resource: string;
  collectionId?: string;
  itemId?: string;
  sub?: string; // "media"
  subId?: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePath(url: URL): Route {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments[0] = "api-collection"
  const resource = segments[1] ?? "";
  const collectionId = segments[2];
  const itemsLiteral = segments[3]; // "items"
  const itemId = segments[4];
  const sub = segments[5]; // "media"
  const subId = segments[6];

  if (resource === "collections" && itemsLiteral === "items") {
    return { resource: "items", collectionId, itemId, sub, subId };
  }
  return { resource, collectionId: segments[2] };
}

// ── Ownership verification ──
async function verifyCollectionOwnership(supabase: any, collectionId: string, userId: string) {
  if (!uuidRegex.test(collectionId)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");
  const { data } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();
  if (!data) throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
}

// ── Allowed MIME types ──
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ══════════════════════════════════════════
// ITEMS handler
// ══════════════════════════════════════════
async function handleItems(
  req: Request, route: Route, userId: string, supabase: any,
  rh: Record<string, string>, log: any,
): Promise<Response> {
  const { collectionId, itemId, sub, subId } = route;
  if (!collectionId) throw new AppError("Missing collection ID", 400, "MISSING_PARAM");
  await verifyCollectionOwnership(supabase, collectionId, userId);

  // ── Media sub-resource ──
  if (sub === "media") {
    return handleMedia(req, collectionId, itemId!, userId, subId, supabase, rh, log);
  }

  // ── LIST items ──
  if (req.method === "GET" && !itemId) {
    const url = new URL(req.url);
    const qp = Object.fromEntries(url.searchParams);
    const pv = validate(itemPagination, qp, rh);
    if (pv.error) return pv.error;

    const { page, page_size, sort } = pv.data;
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    let query = supabase
      .from("collection_items")
      .select("*, owned_plants!inner(id, nickname, scientific_name, common_name, photos, status)", { count: "exact" })
      .eq("collection_id", collectionId)
      .range(from, to);

    query = applyItemSort(query, sort);

    const { data, error, count } = await query;
    if (error) {
      log.error("List items error", { error: error.message });
      throw new AppError("Failed to list items", 500, "LIST_FAILED");
    }

    return new Response(
      JSON.stringify({ data, total: count ?? 0, page, page_size, has_more: (count ?? 0) > from + page_size }),
      { headers: { ...rh, "Content-Type": "application/json" } },
    );
  }

  // ── GET item ──
  if (req.method === "GET" && itemId) {
    if (!uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

    const { data, error } = await supabase
      .from("collection_items")
      .select("*, owned_plants(id, nickname, scientific_name, common_name, photos, status), collection_item_media(*)")
      .eq("id", itemId)
      .eq("collection_id", collectionId)
      .single();

    if (error || !data) throw new AppError("Item not found", 404, "ITEM_NOT_FOUND");

    return new Response(JSON.stringify(data), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── CREATE item ──
  if (req.method === "POST" && !itemId) {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

    const v = validate(itemCreate, body, rh);
    if (v.error) return v.error;

    // Verify the owned_plant belongs to user
    const { data: plant } = await supabase
      .from("owned_plants")
      .select("id")
      .eq("id", v.data.owned_plant_id)
      .eq("user_id", userId)
      .single();
    if (!plant) throw new AppError("Plant not found or not owned by you", 404, "PLANT_NOT_FOUND");

    // Check duplicate
    const { data: dup } = await supabase
      .from("collection_items")
      .select("id")
      .eq("collection_id", collectionId)
      .eq("owned_plant_id", v.data.owned_plant_id)
      .maybeSingle();
    if (dup) throw new AppError("Plant already in this collection", 409, "DUPLICATE_ITEM");

    const { data, error } = await supabase
      .from("collection_items")
      .insert({ ...v.data, collection_id: collectionId })
      .select("*")
      .single();

    if (error) {
      log.error("Create item error", { error: error.message });
      throw new AppError("Failed to add item", 500, "CREATE_FAILED");
    }

    log.info("Item added", { item_id: data.id, collection_id: collectionId });
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── UPDATE item ──
  if (req.method === "PATCH" && itemId) {
    if (!uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

    const v = validate(itemUpdate, body, rh);
    if (v.error) return v.error;

    const { data, error } = await supabase
      .from("collection_items")
      .update(v.data)
      .eq("id", itemId)
      .eq("collection_id", collectionId)
      .select("*")
      .single();

    if (error || !data) throw new AppError("Failed to update item", 500, "UPDATE_FAILED");

    return new Response(JSON.stringify(data), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── DELETE item ──
  if (req.method === "DELETE" && itemId) {
    if (!uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

    // Delete associated media files from storage first
    const svc = getServiceClient();
    const { data: mediaRows } = await supabase
      .from("collection_item_media")
      .select("storage_path")
      .eq("collection_item_id", itemId)
      .eq("user_id", userId);

    if (mediaRows && mediaRows.length > 0) {
      const paths = mediaRows.map((m: any) => m.storage_path);
      await svc.storage.from("collection-photos").remove(paths);
    }

    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemId)
      .eq("collection_id", collectionId);

    if (error) throw new AppError("Failed to delete item", 500, "DELETE_FAILED");

    log.info("Item deleted", { item_id: itemId, collection_id: collectionId });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// MEDIA handler (sub-resource of items)
// ══════════════════════════════════════════
async function handleMedia(
  req: Request, collectionId: string, itemId: string, userId: string,
  mediaId: string | undefined, supabase: any, rh: Record<string, string>, log: any,
): Promise<Response> {
  if (!itemId || !uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

  // Verify item belongs to this collection (RLS already scopes to user)
  const { data: item } = await supabase
    .from("collection_items")
    .select("id")
    .eq("id", itemId)
    .eq("collection_id", collectionId)
    .single();
  if (!item) throw new AppError("Item not found", 404, "ITEM_NOT_FOUND");

  // ── LIST media ──
  if (req.method === "GET" && !mediaId) {
    const { data, error } = await supabase
      .from("collection_item_media")
      .select("*")
      .eq("collection_item_id", itemId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) throw new AppError("Failed to list media", 500, "LIST_FAILED");

    // Append public URLs
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const enriched = (data ?? []).map((m: any) => ({
      ...m,
      public_url: `${supabaseUrl}/storage/v1/object/public/collection-photos/${m.storage_path}`,
    }));

    return new Response(JSON.stringify(enriched), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── UPLOAD media (multipart) ──
  if (req.method === "POST" && !mediaId) {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new AppError("Expected multipart/form-data", 400, "INVALID_CONTENT_TYPE");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new AppError("Missing 'file' field", 400, "MISSING_FILE");

    // Validate file
    if (!ALLOWED_MIME.has(file.type)) {
      throw new AppError(`Unsupported file type: ${file.type}`, 400, "INVALID_FILE_TYPE");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("File exceeds 10 MB limit", 400, "FILE_TOO_LARGE");
    }

    const altText = (formData.get("alt_text") as string) ?? null;
    const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0;
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    // Upload to storage: collection-photos/{userId}/{itemId}/{timestamp}_{filename}
    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const storagePath = `${userId}/${itemId}/${safeName}`;

    const svc = getServiceClient();
    const { error: uploadError } = await svc.storage
      .from("collection-photos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      log.error("Storage upload error", { error: uploadError.message });
      throw new AppError("Failed to upload file", 500, "UPLOAD_FAILED");
    }

    // Insert metadata row
    const { data: row, error: dbError } = await supabase
      .from("collection_item_media")
      .insert({
        collection_item_id: itemId,
        user_id: userId,
        storage_path: storagePath,
        media_type: mediaType,
        alt_text: altText,
        file_size_bytes: file.size,
        mime_type: file.type,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (dbError) {
      // Rollback storage
      await svc.storage.from("collection-photos").remove([storagePath]);
      log.error("Media record insert error", { error: dbError.message });
      throw new AppError("Failed to save media record", 500, "DB_INSERT_FAILED");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const result = {
      ...row,
      public_url: `${supabaseUrl}/storage/v1/object/public/collection-photos/${storagePath}`,
    };

    log.info("Media uploaded", { media_id: row.id, item_id: itemId, size: file.size });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── DELETE media ──
  if (req.method === "DELETE" && mediaId) {
    if (!uuidRegex.test(mediaId)) throw new AppError("Invalid media ID", 400, "INVALID_ID");

    const { data: media } = await supabase
      .from("collection_item_media")
      .select("storage_path")
      .eq("id", mediaId)
      .eq("collection_item_id", itemId)
      .eq("user_id", userId)
      .single();

    if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

    // Delete from storage
    const svc = getServiceClient();
    await svc.storage.from("collection-photos").remove([media.storage_path]);

    // Delete DB row
    await supabase
      .from("collection_item_media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", userId);

    log.info("Media deleted", { media_id: mediaId });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// Main handler
// ══════════════════════════════════════════
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
    const route = parsePath(url);

    // ── Items (and Media sub-resource) ──
    if (route.resource === "items") {
      return await handleItems(req, route, userId, supabase, rh, log);
    }

    // ── Collections ──
    if (route.resource !== "collections") {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    const id = route.collectionId;

    // LIST
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

      if (!include_archived) query = query.is("deleted_at", null);
      query = applyCollectionSort(query, sort);
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new AppError("Failed to list collections", 500, "LIST_FAILED");

      return new Response(
        JSON.stringify({ data, total: count ?? 0, page, page_size, has_more: (count ?? 0) > from + page_size }),
        { headers: { ...rh, "Content-Type": "application/json" } },
      );
    }

    // GET by ID
    if (req.method === "GET" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");
      const { data, error } = await supabase
        .from("collections").select("*").eq("id", id).eq("user_id", userId).single();
      if (error || !data) throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
    }

    // CREATE
    if (req.method === "POST" && !id) {
      let body: unknown;
      try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
      const v = validate(collectionCreate, body, rh);
      if (v.error) return v.error;

      const { data, error } = await supabase
        .from("collections").insert({ ...v.data, user_id: userId }).select("*").single();
      if (error) throw new AppError("Failed to create collection", 500, "CREATE_FAILED");

      log.info("Collection created", { id: data.id });
      return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
    }

    // UPDATE
    if (req.method === "PATCH" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");
      let body: unknown;
      try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
      const v = validate(collectionUpdate, body, rh);
      if (v.error) return v.error;

      const { data: existing } = await supabase
        .from("collections").select("is_default").eq("id", id).eq("user_id", userId).single();
      if (!existing) throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      if (existing.is_default && v.data.name) throw new AppError("Cannot rename the default collection", 400, "DEFAULT_RENAME_BLOCKED");

      const { data, error } = await supabase
        .from("collections").update(v.data).eq("id", id).eq("user_id", userId).is("deleted_at", null).select("*").single();
      if (error || !data) throw new AppError("Failed to update collection", 500, "UPDATE_FAILED");

      log.info("Collection updated", { id });
      return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
    }

    // ARCHIVE
    if (req.method === "DELETE" && id) {
      if (!uuidRegex.test(id)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");
      const { data: existing } = await supabase
        .from("collections").select("is_default").eq("id", id).eq("user_id", userId).single();
      if (!existing) throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
      if (existing.is_default) throw new AppError("Cannot archive the default collection", 400, "DEFAULT_DELETE_BLOCKED");

      const { error } = await supabase
        .from("collections").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).is("deleted_at", null);
      if (error) throw new AppError("Failed to archive collection", 500, "ARCHIVE_FAILED");

      log.info("Collection archived", { id });
      return new Response(null, { status: 204, headers: rh });
    }

    throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, rh, requestId, log);
  }
});
