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

// ── Tag schemas ──
const tagCreate = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
});

const tagUpdate = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const tagPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Location schemas ──
const locationCreate = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

const locationUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
});

// ── Sharing schemas ──
const shareUpdate = z.object({
  visibility: z.enum(["private", "link", "public"]),
  allow_download: z.boolean().default(false),
  expires_at: z.string().datetime().nullable().optional(),
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

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    case "name_asc": return query.order("owned_plant_id", { ascending: true });
    case "sort_order":
    default: return query.order("sort_order", { ascending: true }).order("added_at", { ascending: false });
  }
}

// ── Route parser ──
interface Route {
  resource: string;
  collectionId?: string;
  itemId?: string;
  sub?: string;
  subId?: string;
  // For /tags, /locations, /ref, /plants routes
  primaryId?: string;
  secondaryResource?: string;
  secondaryId?: string;
}

function parsePath(url: URL): Route {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments[0] = "api-collection"
  const resource = segments[1] ?? "";
  
  // /tags, /tags/:id
  if (resource === "tags") {
    return { resource: "tags", primaryId: segments[2] };
  }

  // /locations, /locations/:id
  if (resource === "locations") {
    return { resource: "locations", primaryId: segments[2] };
  }

  // /ref/location-types, /ref/tag-categories
  if (resource === "ref") {
    return { resource: "ref", sub: segments[2] };
  }

  // /plants/:plantId/tags, /plants/:plantId/tags/:tagId
  if (resource === "plants") {
    return {
      resource: "plant-tags",
      primaryId: segments[2], // plantId
      secondaryId: segments[4], // tagId
    };
  }

  // /shared/:token (public, no auth)
  if (resource === "shared") {
    return { resource: "shared", primaryId: segments[2] };
  }

  // /collections/:id/items/:itemId/media/:mediaId
  // /collections/:id/share
  const collectionId = segments[2];
  const itemsLiteral = segments[3];
  const itemId = segments[4];
  const sub = segments[5];
  const subId = segments[6];

  if (resource === "collections" && itemsLiteral === "share") {
    return { resource: "collection-share", collectionId };
  }
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
// TAGS handler
// ══════════════════════════════════════════
async function handleTags(
  req: Request, route: Route, userId: string, supabase: any,
  rh: Record<string, string>, log: any,
): Promise<Response> {
  const id = route.primaryId;

  // LIST tags
  if (req.method === "GET" && !id) {
    const url = new URL(req.url);
    const qp = Object.fromEntries(url.searchParams);
    const pv = validate(tagPagination, qp, rh);
    if (pv.error) return pv.error;

    const { page, page_size } = pv.data;
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data, error, count } = await supabase
      .from("tags")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) throw new AppError("Failed to list tags", 500, "LIST_FAILED");

    return new Response(
      JSON.stringify({ data, total: count ?? 0, page, page_size, has_more: (count ?? 0) > from + page_size }),
      { headers: { ...rh, "Content-Type": "application/json" } },
    );
  }

  // GET tag
  if (req.method === "GET" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid tag ID", 400, "INVALID_ID");
    const { data, error } = await supabase
      .from("tags").select("*").eq("id", id).eq("user_id", userId).is("deleted_at", null).single();
    if (error || !data) throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");
    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // CREATE tag
  if (req.method === "POST" && !id) {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
    const v = validate(tagCreate, body, rh);
    if (v.error) return v.error;

    // Check duplicate name for this user
    const { data: dup } = await supabase
      .from("tags").select("id").eq("user_id", userId).ilike("name", v.data.name).is("deleted_at", null).maybeSingle();
    if (dup) throw new AppError("Tag with this name already exists", 409, "DUPLICATE_TAG");

    const { data, error } = await supabase
      .from("tags").insert({ ...v.data, user_id: userId }).select("*").single();
    if (error) throw new AppError("Failed to create tag", 500, "CREATE_FAILED");

    log.info("Tag created", { id: data.id });
    return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
  }

  // UPDATE tag
  if (req.method === "PATCH" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid tag ID", 400, "INVALID_ID");
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
    const v = validate(tagUpdate, body, rh);
    if (v.error) return v.error;

    if (v.data.name) {
      const { data: dup } = await supabase
        .from("tags").select("id").eq("user_id", userId).ilike("name", v.data.name).is("deleted_at", null).neq("id", id).maybeSingle();
      if (dup) throw new AppError("Tag with this name already exists", 409, "DUPLICATE_TAG");
    }

    const { data, error } = await supabase
      .from("tags").update({ ...v.data, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).is("deleted_at", null).select("*").single();
    if (error || !data) throw new AppError("Failed to update tag", 500, "UPDATE_FAILED");

    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // DELETE (soft) tag
  if (req.method === "DELETE" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid tag ID", 400, "INVALID_ID");

    // Remove all item_tags associations first
    await supabase.from("item_tags").delete().eq("tag_id", id);

    const { error } = await supabase
      .from("tags").update({ deleted_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).is("deleted_at", null);
    if (error) throw new AppError("Failed to delete tag", 500, "DELETE_FAILED");

    log.info("Tag deleted", { id });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// PLANT-TAGS handler (attach/detach)
// ══════════════════════════════════════════
async function handlePlantTags(
  req: Request, route: Route, userId: string, supabase: any,
  rh: Record<string, string>, log: any,
): Promise<Response> {
  const plantId = route.primaryId;
  const tagId = route.secondaryId;

  if (!plantId || !uuidRegex.test(plantId)) throw new AppError("Invalid plant ID", 400, "INVALID_ID");

  // Verify plant ownership
  const { data: plant } = await supabase
    .from("owned_plants").select("id").eq("id", plantId).eq("user_id", userId).single();
  if (!plant) throw new AppError("Plant not found or not owned by you", 404, "PLANT_NOT_FOUND");

  // LIST tags for a plant
  if (req.method === "GET" && !tagId) {
    const { data, error } = await supabase
      .from("item_tags")
      .select("*, tags!inner(id, name, color)")
      .eq("owned_plant_id", plantId);

    if (error) throw new AppError("Failed to list plant tags", 500, "LIST_FAILED");
    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // ATTACH tag to plant
  if (req.method === "POST" && !tagId) {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

    const schema = z.object({ tag_id: z.string().uuid() });
    const v = validate(schema, body, rh);
    if (v.error) return v.error;

    // Verify tag belongs to user
    const { data: tag } = await supabase
      .from("tags").select("id").eq("id", v.data.tag_id).eq("user_id", userId).is("deleted_at", null).single();
    if (!tag) throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");

    // Check duplicate
    const { data: dup } = await supabase
      .from("item_tags").select("id")
      .eq("owned_plant_id", plantId).eq("tag_id", v.data.tag_id).maybeSingle();
    if (dup) throw new AppError("Tag already attached", 409, "DUPLICATE_TAG_ATTACHMENT");

    const { data, error } = await supabase
      .from("item_tags").insert({ owned_plant_id: plantId, tag_id: v.data.tag_id }).select("*, tags(id, name, color)").single();
    if (error) throw new AppError("Failed to attach tag", 500, "CREATE_FAILED");

    log.info("Tag attached", { plant_id: plantId, tag_id: v.data.tag_id });
    return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
  }

  // DETACH tag from plant
  if (req.method === "DELETE" && tagId) {
    if (!uuidRegex.test(tagId)) throw new AppError("Invalid tag ID", 400, "INVALID_ID");

    const { error } = await supabase
      .from("item_tags").delete()
      .eq("owned_plant_id", plantId).eq("tag_id", tagId);
    if (error) throw new AppError("Failed to detach tag", 500, "DELETE_FAILED");

    log.info("Tag detached", { plant_id: plantId, tag_id: tagId });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// LOCATIONS handler
// ══════════════════════════════════════════
async function handleLocations(
  req: Request, route: Route, userId: string, supabase: any,
  rh: Record<string, string>, log: any,
): Promise<Response> {
  const id = route.primaryId;

  // LIST locations
  if (req.method === "GET" && !id) {
    const { data, error } = await supabase
      .from("plant_locations")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) throw new AppError("Failed to list locations", 500, "LIST_FAILED");
    return new Response(JSON.stringify({ data }), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // GET location
  if (req.method === "GET" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid location ID", 400, "INVALID_ID");
    const { data, error } = await supabase
      .from("plant_locations").select("*").eq("id", id).eq("user_id", userId).is("deleted_at", null).single();
    if (error || !data) throw new AppError("Location not found", 404, "LOCATION_NOT_FOUND");
    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // CREATE location
  if (req.method === "POST" && !id) {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
    const v = validate(locationCreate, body, rh);
    if (v.error) return v.error;

    const { data, error } = await supabase
      .from("plant_locations").insert({ ...v.data, user_id: userId }).select("*").single();
    if (error) throw new AppError("Failed to create location", 500, "CREATE_FAILED");

    log.info("Location created", { id: data.id });
    return new Response(JSON.stringify(data), { status: 201, headers: { ...rh, "Content-Type": "application/json" } });
  }

  // UPDATE location
  if (req.method === "PATCH" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid location ID", 400, "INVALID_ID");
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
    const v = validate(locationUpdate, body, rh);
    if (v.error) return v.error;

    const { data, error } = await supabase
      .from("plant_locations").update({ ...v.data, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).is("deleted_at", null).select("*").single();
    if (error || !data) throw new AppError("Failed to update location", 500, "UPDATE_FAILED");

    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // DELETE (soft) location
  if (req.method === "DELETE" && id) {
    if (!uuidRegex.test(id)) throw new AppError("Invalid location ID", 400, "INVALID_ID");

    // Unassign plants from this location
    await supabase.from("owned_plants").update({ location_id: null }).eq("location_id", id).eq("user_id", userId);

    const { error } = await supabase
      .from("plant_locations").update({ deleted_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).is("deleted_at", null);
    if (error) throw new AppError("Failed to delete location", 500, "DELETE_FAILED");

    log.info("Location deleted", { id });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// REF handler (public reference data)
// ══════════════════════════════════════════
async function handleRef(
  req: Request, route: Route, supabase: any,
  rh: Record<string, string>,
): Promise<Response> {
  if (req.method !== "GET") throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");

  if (route.sub === "location-types") {
    const svc = getServiceClient();
    const { data, error } = await svc
      .from("ref_location_types").select("*").order("display_order", { ascending: true });
    if (error) throw new AppError("Failed to list location types", 500, "LIST_FAILED");
    return new Response(JSON.stringify({ data }), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  if (route.sub === "tag-categories") {
    const svc = getServiceClient();
    const { data, error } = await svc
      .from("ref_tag_categories").select("*").order("display_order", { ascending: true });
    if (error) throw new AppError("Failed to list tag categories", 500, "LIST_FAILED");
    return new Response(JSON.stringify({ data }), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  throw new AppError("Unknown reference resource", 404, "NOT_FOUND");
}

// ══════════════════════════════════════════
// SHARING handler (owner manages share settings)
// ══════════════════════════════════════════
async function handleCollectionShare(
  req: Request, route: Route, userId: string, supabase: any,
  rh: Record<string, string>, log: any,
): Promise<Response> {
  const collectionId = route.collectionId;
  if (!collectionId || !uuidRegex.test(collectionId)) throw new AppError("Invalid collection ID", 400, "INVALID_ID");
  await verifyCollectionOwnership(supabase, collectionId, userId);

  // GET share settings
  if (req.method === "GET") {
    const { data } = await supabase
      .from("collection_shares").select("*")
      .eq("collection_id", collectionId).eq("user_id", userId).maybeSingle();

    if (!data) {
      return new Response(JSON.stringify({ visibility: "private", share_token: null, allow_download: false, view_count: 0 }), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // PUT/PATCH share settings (upsert)
  if (req.method === "PUT" || req.method === "PATCH") {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }
    const v = validate(shareUpdate, body, rh);
    if (v.error) return v.error;

    const { data: existing } = await supabase
      .from("collection_shares").select("id")
      .eq("collection_id", collectionId).eq("user_id", userId).maybeSingle();

    let data: any;
    let error: any;

    if (existing) {
      const upd: any = { visibility: v.data.visibility, allow_download: v.data.allow_download, updated_at: new Date().toISOString() };
      if (v.data.expires_at !== undefined) upd.expires_at = v.data.expires_at;
      ({ data, error } = await supabase.from("collection_shares").update(upd).eq("id", existing.id).select("*").single());
    } else {
      const ins: any = { collection_id: collectionId, user_id: userId, visibility: v.data.visibility, allow_download: v.data.allow_download };
      if (v.data.expires_at !== undefined) ins.expires_at = v.data.expires_at;
      ({ data, error } = await supabase.from("collection_shares").insert(ins).select("*").single());
    }

    if (error || !data) throw new AppError("Failed to update share settings", 500, "UPDATE_FAILED");
    log.info("Share updated", { collection_id: collectionId, visibility: v.data.visibility });
    return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
  }

  // DELETE share (revoke)
  if (req.method === "DELETE") {
    const { error } = await supabase.from("collection_shares").delete().eq("collection_id", collectionId).eq("user_id", userId);
    if (error) throw new AppError("Failed to revoke share", 500, "DELETE_FAILED");
    log.info("Share revoked", { collection_id: collectionId });
    return new Response(null, { status: 204, headers: rh });
  }

  throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}

// ══════════════════════════════════════════
// PUBLIC SHARED view (no auth, token-based)
// ══════════════════════════════════════════
async function handleSharedView(
  req: Request, route: Route, rh: Record<string, string>, log: any,
): Promise<Response> {
  if (req.method !== "GET") throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");

  const token = route.primaryId;
  if (!token || token.length < 16) throw new AppError("Invalid share token", 400, "INVALID_TOKEN");

  const svc = getServiceClient();
  const { data, error } = await svc.rpc("get_shared_collection", { p_token: token });

  if (error) {
    log.error("Shared view RPC error", { error: error.message });
    throw new AppError("Failed to load shared collection", 500, "RPC_FAILED");
  }
  if (!data) throw new AppError("Collection not found or share expired", 404, "NOT_FOUND");

  log.info("Shared view accessed", { token: token.slice(0, 8) + "..." });
  return new Response(JSON.stringify(data), { headers: { ...rh, "Content-Type": "application/json" } });
}

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

    // Support tag/location filters
    const tagFilter = url.searchParams.get("tag");
    const locationFilter = url.searchParams.get("location");

    let query = supabase
      .from("collection_items")
      .select("*, owned_plants!inner(id, nickname, scientific_name, common_name, photos, status, location_id)", { count: "exact" })
      .eq("collection_id", collectionId)
      .range(from, to);

    // Filter by location on owned_plants
    if (locationFilter && uuidRegex.test(locationFilter)) {
      query = query.eq("owned_plants.location_id", locationFilter);
    }

    query = applyItemSort(query, sort);
    const { data, error, count } = await query;

    if (error) {
      log.error("List items error", { error: error.message });
      throw new AppError("Failed to list items", 500, "LIST_FAILED");
    }

    // If tag filter, post-filter by checking item_tags
    let filtered = data;
    if (tagFilter && uuidRegex.test(tagFilter) && data && data.length > 0) {
      const plantIds = data.map((d: any) => d.owned_plant_id);
      const { data: taggedPlants } = await supabase
        .from("item_tags")
        .select("owned_plant_id")
        .eq("tag_id", tagFilter)
        .in("owned_plant_id", plantIds);

      const taggedSet = new Set((taggedPlants ?? []).map((t: any) => t.owned_plant_id));
      filtered = data.filter((d: any) => taggedSet.has(d.owned_plant_id));
    }

    return new Response(
      JSON.stringify({ data: filtered, total: tagFilter ? filtered.length : (count ?? 0), page, page_size, has_more: (count ?? 0) > from + page_size }),
      { headers: { ...rh, "Content-Type": "application/json" } },
    );
  }

  // ── GET item ──
  if (req.method === "GET" && itemId) {
    if (!uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

    const { data, error } = await supabase
      .from("collection_items")
      .select("*, owned_plants(id, nickname, scientific_name, common_name, photos, status, location_id), collection_item_media(*)")
      .eq("id", itemId)
      .eq("collection_id", collectionId)
      .single();

    if (error || !data) throw new AppError("Item not found", 404, "ITEM_NOT_FOUND");

    // Enrich with tags
    const { data: tags } = await supabase
      .from("item_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("owned_plant_id", data.owned_plant_id);

    return new Response(JSON.stringify({ ...data, tags: tags ?? [] }), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── CREATE item ──
  if (req.method === "POST" && !itemId) {
    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400, "INVALID_JSON"); }

    const v = validate(itemCreate, body, rh);
    if (v.error) return v.error;

    const { data: plant } = await supabase
      .from("owned_plants").select("id").eq("id", v.data.owned_plant_id).eq("user_id", userId).single();
    if (!plant) throw new AppError("Plant not found or not owned by you", 404, "PLANT_NOT_FOUND");

    const { data: dup } = await supabase
      .from("collection_items").select("id")
      .eq("collection_id", collectionId).eq("owned_plant_id", v.data.owned_plant_id).maybeSingle();
    if (dup) throw new AppError("Plant already in this collection", 409, "DUPLICATE_ITEM");

    const { data, error } = await supabase
      .from("collection_items").insert({ ...v.data, collection_id: collectionId }).select("*").single();

    if (error) {
      log.error("Create item error", { error: error.message });
      throw new AppError("Failed to add item", 500, "CREATE_FAILED");
    }

    log.info("Item added", { item_id: data.id, collection_id: collectionId });
    return new Response(JSON.stringify(data), {
      status: 201, headers: { ...rh, "Content-Type": "application/json" },
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
      .from("collection_items").update(v.data)
      .eq("id", itemId).eq("collection_id", collectionId).select("*").single();

    if (error || !data) throw new AppError("Failed to update item", 500, "UPDATE_FAILED");

    return new Response(JSON.stringify(data), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── DELETE item ──
  if (req.method === "DELETE" && itemId) {
    if (!uuidRegex.test(itemId)) throw new AppError("Invalid item ID", 400, "INVALID_ID");

    const svc = getServiceClient();
    const { data: mediaRows } = await supabase
      .from("collection_item_media").select("storage_path")
      .eq("collection_item_id", itemId).eq("user_id", userId);

    if (mediaRows && mediaRows.length > 0) {
      const paths = mediaRows.map((m: any) => m.storage_path);
      await svc.storage.from("collection-photos").remove(paths);
    }

    const { error } = await supabase
      .from("collection_items").delete()
      .eq("id", itemId).eq("collection_id", collectionId);

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

  const { data: item } = await supabase
    .from("collection_items").select("id")
    .eq("id", itemId).eq("collection_id", collectionId).single();
  if (!item) throw new AppError("Item not found", 404, "ITEM_NOT_FOUND");

  // ── LIST media ──
  if (req.method === "GET" && !mediaId) {
    const { data, error } = await supabase
      .from("collection_item_media").select("*")
      .eq("collection_item_id", itemId).eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) throw new AppError("Failed to list media", 500, "LIST_FAILED");

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

    if (!ALLOWED_MIME.has(file.type)) {
      throw new AppError(`Unsupported file type: ${file.type}`, 400, "INVALID_FILE_TYPE");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("File exceeds 10 MB limit", 400, "FILE_TOO_LARGE");
    }

    const altText = (formData.get("alt_text") as string) ?? null;
    const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0;
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const storagePath = `${userId}/${itemId}/${safeName}`;

    const svc = getServiceClient();
    const { error: uploadError } = await svc.storage
      .from("collection-photos")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      log.error("Storage upload error", { error: uploadError.message });
      throw new AppError("Failed to upload file", 500, "UPLOAD_FAILED");
    }

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
      .select("*").single();

    if (dbError) {
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
      status: 201, headers: { ...rh, "Content-Type": "application/json" },
    });
  }

  // ── DELETE media ──
  if (req.method === "DELETE" && mediaId) {
    if (!uuidRegex.test(mediaId)) throw new AppError("Invalid media ID", 400, "INVALID_ID");

    const { data: media } = await supabase
      .from("collection_item_media").select("storage_path")
      .eq("id", mediaId).eq("collection_item_id", itemId).eq("user_id", userId).single();

    if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

    const svc = getServiceClient();
    await svc.storage.from("collection-photos").remove([media.storage_path]);

    await supabase.from("collection_item_media").delete()
      .eq("id", mediaId).eq("user_id", userId);

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
    const url = new URL(req.url);
    const route = parsePath(url);

    // ── Ref endpoints (public, no auth needed) ──
    if (route.resource === "ref") {
      const svc = getServiceClient();
      return await handleRef(req, route, svc, rh);
    }

    // ── Public shared view (no auth, token-based) ──
    if (route.resource === "shared") {
      return await handleSharedView(req, route, rh, log);
    }

    // ── All other endpoints require auth ──
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      throw new AppError(auth.error, 401, "UNAUTHORIZED");
    }
    const { userId, supabase } = auth;

    // ── Tags ──
    if (route.resource === "tags") {
      return await handleTags(req, route, userId, supabase, rh, log);
    }

    // ── Plant-Tags (attach/detach) ──
    if (route.resource === "plant-tags") {
      return await handlePlantTags(req, route, userId, supabase, rh, log);
    }

    // ── Locations ──
    if (route.resource === "locations") {
      return await handleLocations(req, route, userId, supabase, rh, log);
    }

    // ── Collection share settings (owner) ──
    if (route.resource === "collection-share") {
      return await handleCollectionShare(req, route, userId, supabase, rh, log);
    }

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
        .from("collections").select("*", { count: "exact" }).eq("user_id", userId);

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
