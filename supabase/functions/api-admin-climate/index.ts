/**
 * api-admin-climate – Admin CRUD for Care Profiles & Region Overrides
 *
 * Routes:
 *   ── Care Profiles ──
 *   GET    /care-profiles                         → list (with filters)
 *   GET    /care-profiles/:id                     → single profile + version history
 *   POST   /care-profiles                         → create
 *   PUT    /care-profiles/:id                     → update (creates versioned snapshot)
 *   DELETE /care-profiles/:id                     → soft-delete via moderation_status
 *   PATCH  /care-profiles/:id/moderate            → approve / reject
 *
 *   ── Region Overrides ──
 *   GET    /region-overrides                      → list (with filters)
 *   GET    /region-overrides/:id                  → single override + version history
 *   POST   /region-overrides                      → create
 *   PUT    /region-overrides/:id                  → update (creates versioned snapshot)
 *   DELETE /region-overrides/:id                  → hard delete
 *   PATCH  /region-overrides/:id/moderate         → approve / reject
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";
import { validate, schemas, z } from "../_shared/validation.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ── Validation schemas ──

const careProfileCreateSchema = z.object({
  plant_id: schemas.uuid,
  watering_frequency: z.string().max(100).nullish(),
  watering_notes: z.string().max(2000).nullish(),
  fertilizing_frequency: z.string().max(100).nullish(),
  fertilizing_notes: z.string().max(2000).nullish(),
  pruning_season: z.string().max(100).nullish(),
  pruning_notes: z.string().max(2000).nullish(),
  repotting_frequency: z.string().max(100).nullish(),
  repotting_notes: z.string().max(2000).nullish(),
  ideal_temp_min_c: z.coerce.number().min(-60).max(60).nullish(),
  ideal_temp_max_c: z.coerce.number().min(-60).max(60).nullish(),
  ideal_humidity_pct_min: z.coerce.number().int().min(0).max(100).nullish(),
  ideal_humidity_pct_max: z.coerce.number().int().min(0).max(100).nullish(),
  preferred_soil_type: z.string().max(100).nullish(),
  preferred_soil_ph: z.enum(["acid", "neutral", "alkaline", "any"]).nullish(),
  light_requirement: z.enum(["full_sun", "partial_shade", "shade", "indirect", "any"]).nullish(),
  dormancy_period: z.string().max(200).nullish(),
  propagation_methods: z.array(z.string().max(100)).max(20).nullish(),
  common_pests: z.array(z.string().max(100)).max(30).nullish(),
  common_diseases: z.array(z.string().max(100)).max(30).nullish(),
  companion_plants: z.array(z.string().max(100)).max(30).nullish(),
  change_reason: z.string().max(500).nullish(),
});

const careProfileUpdateSchema = careProfileCreateSchema.partial().omit({ plant_id: true });

const regionOverrideCreateSchema = z.object({
  climate_zone_id: schemas.uuid,
  country_code: z.string().regex(/^[A-Z]{2}$/),
  province: z.string().max(100).nullish(),
  postal_prefix: z.string().max(20).nullish(),
  lat_min: z.coerce.number().min(-90).max(90).nullish(),
  lat_max: z.coerce.number().min(-90).max(90).nullish(),
  lon_min: z.coerce.number().min(-180).max(180).nullish(),
  lon_max: z.coerce.number().min(-180).max(180).nullish(),
  altitude_min_m: z.coerce.number().int().nullish(),
  altitude_max_m: z.coerce.number().int().nullish(),
  local_label: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
  is_active: z.boolean().default(true),
  change_reason: z.string().max(500).nullish(),
});

const regionOverrideUpdateSchema = regionOverrideCreateSchema.partial();

const moderateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().max(1000).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  moderation_status: z.enum(["approved", "pending", "rejected"]).optional(),
  country_code: z.string().regex(/^[A-Z]{2}$/).optional(),
  plant_id: schemas.uuid.optional(),
});

// ── Helpers ──

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function parseRoute(url: URL): { segments: string[] } {
  const raw = url.pathname.replace(/^\/api-admin-climate\/?/, "").replace(/\/$/, "");
  return { segments: raw.split("/").filter(Boolean) };
}

async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new AppError("Unauthorized", 401, "INVALID_TOKEN");
  }

  const userId = data.claims.sub as string;

  const { data: roleData } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  return userId;
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("api-admin-climate", req);
  const h = withCorrelationId(corsHeaders, requestId);

  try {
    const url = new URL(req.url);
    const { segments } = parseRoute(url);
    const method = req.method;
    const params = url.searchParams;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // All routes require admin
    const adminId = await requireAdmin(req, supabaseUrl, anonKey);

    // ════════════════════════════════════════
    //  CARE PROFILES
    // ════════════════════════════════════════

    if (segments[0] === "care-profiles") {

      // ── LIST ──
      if (method === "GET" && !segments[1]) {
        const lv = validate(listQuerySchema, {
          page: params.get("page") ?? undefined,
          per_page: params.get("per_page") ?? undefined,
          moderation_status: params.get("moderation_status") ?? undefined,
          plant_id: params.get("plant_id") ?? undefined,
        }, h);
        if (lv.error) return lv.error;
        const { page, per_page, moderation_status, plant_id } = lv.data;

        let query = db.from("species_care_profiles").select("*", { count: "exact" });
        if (moderation_status) query = query.eq("moderation_status", moderation_status);
        if (plant_id) query = query.eq("plant_id", plant_id);
        query = query.order("updated_at", { ascending: false })
          .range((page - 1) * per_page, page * per_page - 1);

        const { data, count, error } = await query;
        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("List care profiles", { count, page });
        return json({ data, total: count, page, per_page }, 200, h);
      }

      // ── MODERATE ──
      if (method === "PATCH" && segments[1] && segments[2] === "moderate") {
        const profileId = segments[1];
        const uv = schemas.uuid.safeParse(profileId);
        if (!uv.success) throw new AppError("Invalid profile ID", 400, "INVALID_ID");

        const body = await req.json();
        const mv = validate(moderateSchema, body, h);
        if (mv.error) return mv.error;

        const updateData: Record<string, unknown> = {
          moderation_status: mv.data.action === "approve" ? "approved" : "rejected",
          moderated_by: adminId,
          moderated_at: new Date().toISOString(),
        };
        if (mv.data.action === "reject") {
          updateData.rejection_reason = mv.data.rejection_reason ?? null;
        }

        const { data, error } = await db
          .from("species_care_profiles")
          .update(updateData)
          .eq("id", profileId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");
        if (!data) throw new AppError("Profile not found", 404, "NOT_FOUND");

        log.info("Moderated care profile", { profileId, action: mv.data.action });
        return json(data, 200, h);
      }

      // ── GET SINGLE ──
      if (method === "GET" && segments[1]) {
        const profileId = segments[1];
        const uv = schemas.uuid.safeParse(profileId);
        if (!uv.success) throw new AppError("Invalid profile ID", 400, "INVALID_ID");

        const { data, error } = await db
          .from("species_care_profiles")
          .select("*")
          .eq("id", profileId)
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");
        if (!data) throw new AppError("Profile not found", 404, "NOT_FOUND");

        // Fetch version history
        const { data: history } = await db
          .from("species_care_profiles")
          .select("id, version, change_reason, moderation_status, moderated_by, moderated_at, created_at")
          .eq("plant_id", data.plant_id)
          .order("version", { ascending: false })
          .limit(20);

        log.info("Get care profile", { profileId });
        return json({ profile: data, version_history: history ?? [] }, 200, h);
      }

      // ── CREATE ──
      if (method === "POST" && !segments[1]) {
        const body = await req.json();
        const cv = validate(careProfileCreateSchema, body, h);
        if (cv.error) return cv.error;

        const { change_reason, ...profileData } = cv.data;

        const { data, error } = await db
          .from("species_care_profiles")
          .insert({
            ...profileData,
            version: 1,
            change_reason,
            moderation_status: "approved",
            moderated_by: adminId,
            moderated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") throw new AppError("Care profile already exists for this plant", 409, "DUPLICATE");
          throw new AppError(error.message, 500, "DB_ERROR");
        }

        log.info("Created care profile", { id: data.id, plant_id: cv.data.plant_id });
        return json(data, 201, h);
      }

      // ── UPDATE (versioned) ──
      if (method === "PUT" && segments[1]) {
        const profileId = segments[1];
        const uv = schemas.uuid.safeParse(profileId);
        if (!uv.success) throw new AppError("Invalid profile ID", 400, "INVALID_ID");

        const body = await req.json();
        const uVal = validate(careProfileUpdateSchema, body, h);
        if (uVal.error) return uVal.error;

        // Fetch current version
        const { data: current, error: fetchErr } = await db
          .from("species_care_profiles")
          .select("*")
          .eq("id", profileId)
          .single();

        if (fetchErr || !current) throw new AppError("Profile not found", 404, "NOT_FOUND");

        // Create snapshot of old version
        const { id: _id, created_at: _ca, updated_at: _ua, ...snapshotData } = current;
        const { data: snapshot } = await db
          .from("species_care_profiles")
          .insert({
            ...snapshotData,
            moderation_status: "approved",
            previous_version_id: null,
          })
          .select("id")
          .single();

        const { change_reason, ...updateFields } = uVal.data;

        const { data, error } = await db
          .from("species_care_profiles")
          .update({
            ...updateFields,
            version: (current.version ?? 1) + 1,
            change_reason,
            previous_version_id: snapshot?.id ?? null,
            moderated_by: adminId,
            moderated_at: new Date().toISOString(),
          })
          .eq("id", profileId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("Updated care profile", { profileId, newVersion: data.version });
        return json(data, 200, h);
      }

      // ── DELETE ──
      if (method === "DELETE" && segments[1]) {
        const profileId = segments[1];
        const uv = schemas.uuid.safeParse(profileId);
        if (!uv.success) throw new AppError("Invalid profile ID", 400, "INVALID_ID");

        const { data, error } = await db
          .from("species_care_profiles")
          .update({
            moderation_status: "rejected",
            rejection_reason: "Deleted by admin",
            moderated_by: adminId,
            moderated_at: new Date().toISOString(),
          })
          .eq("id", profileId)
          .select("id")
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");
        if (!data) throw new AppError("Profile not found", 404, "NOT_FOUND");

        log.info("Soft-deleted care profile", { profileId });
        return json({ deleted: true, id: data.id }, 200, h);
      }
    }

    // ════════════════════════════════════════
    //  REGION OVERRIDES
    // ════════════════════════════════════════

    if (segments[0] === "region-overrides") {

      // ── LIST ──
      if (method === "GET" && !segments[1]) {
        const lv = validate(listQuerySchema, {
          page: params.get("page") ?? undefined,
          per_page: params.get("per_page") ?? undefined,
          moderation_status: params.get("moderation_status") ?? undefined,
          country_code: params.get("country_code") ?? undefined,
        }, h);
        if (lv.error) return lv.error;
        const { page, per_page, moderation_status, country_code } = lv.data;

        let query = db.from("region_overrides").select("*, climate_zones(system, code, label)", { count: "exact" });
        if (moderation_status) query = query.eq("moderation_status", moderation_status);
        if (country_code) query = query.eq("country_code", country_code);
        query = query.order("updated_at", { ascending: false })
          .range((page - 1) * per_page, page * per_page - 1);

        const { data, count, error } = await query;
        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("List region overrides", { count, page });
        return json({ data, total: count, page, per_page }, 200, h);
      }

      // ── MODERATE ──
      if (method === "PATCH" && segments[1] && segments[2] === "moderate") {
        const overrideId = segments[1];
        const uv = schemas.uuid.safeParse(overrideId);
        if (!uv.success) throw new AppError("Invalid override ID", 400, "INVALID_ID");

        const body = await req.json();
        const mv = validate(moderateSchema, body, h);
        if (mv.error) return mv.error;

        const updateData: Record<string, unknown> = {
          moderation_status: mv.data.action === "approve" ? "approved" : "rejected",
          moderated_by: adminId,
          moderated_at: new Date().toISOString(),
        };

        const { data, error } = await db
          .from("region_overrides")
          .update(updateData)
          .eq("id", overrideId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");
        if (!data) throw new AppError("Override not found", 404, "NOT_FOUND");

        log.info("Moderated region override", { overrideId, action: mv.data.action });
        return json(data, 200, h);
      }

      // ── GET SINGLE ──
      if (method === "GET" && segments[1]) {
        const overrideId = segments[1];
        const uv = schemas.uuid.safeParse(overrideId);
        if (!uv.success) throw new AppError("Invalid override ID", 400, "INVALID_ID");

        const { data, error } = await db
          .from("region_overrides")
          .select("*, climate_zones(system, code, label, min_temp_c, max_temp_c)")
          .eq("id", overrideId)
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");
        if (!data) throw new AppError("Override not found", 404, "NOT_FOUND");

        // Version history
        const { data: history } = await db
          .from("region_overrides")
          .select("id, version, change_reason, moderation_status, moderated_by, moderated_at, created_at")
          .eq("country_code", data.country_code)
          .eq("climate_zone_id", data.climate_zone_id)
          .order("version", { ascending: false })
          .limit(20);

        log.info("Get region override", { overrideId });
        return json({ override: data, version_history: history ?? [] }, 200, h);
      }

      // ── CREATE ──
      if (method === "POST" && !segments[1]) {
        const body = await req.json();
        const cv = validate(regionOverrideCreateSchema, body, h);
        if (cv.error) return cv.error;

        const { change_reason, ...overrideData } = cv.data;

        const { data, error } = await db
          .from("region_overrides")
          .insert({
            ...overrideData,
            version: 1,
            change_reason,
            moderation_status: "approved",
            moderated_by: adminId,
            moderated_at: new Date().toISOString(),
            created_by: adminId,
          })
          .select()
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("Created region override", { id: data.id, country_code: cv.data.country_code });
        return json(data, 201, h);
      }

      // ── UPDATE (versioned) ──
      if (method === "PUT" && segments[1]) {
        const overrideId = segments[1];
        const uv = schemas.uuid.safeParse(overrideId);
        if (!uv.success) throw new AppError("Invalid override ID", 400, "INVALID_ID");

        const body = await req.json();
        const uVal = validate(regionOverrideUpdateSchema, body, h);
        if (uVal.error) return uVal.error;

        // Fetch current
        const { data: current, error: fetchErr } = await db
          .from("region_overrides")
          .select("*")
          .eq("id", overrideId)
          .single();

        if (fetchErr || !current) throw new AppError("Override not found", 404, "NOT_FOUND");

        // Snapshot old version
        const { id: _id, created_at: _ca, updated_at: _ua, ...snapshotData } = current;
        const { data: snapshot } = await db
          .from("region_overrides")
          .insert({
            ...snapshotData,
            previous_version_id: null,
          })
          .select("id")
          .single();

        const { change_reason, ...updateFields } = uVal.data;

        const { data, error } = await db
          .from("region_overrides")
          .update({
            ...updateFields,
            version: (current.version ?? 1) + 1,
            change_reason,
            previous_version_id: snapshot?.id ?? null,
            moderated_by: adminId,
            moderated_at: new Date().toISOString(),
          })
          .eq("id", overrideId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("Updated region override", { overrideId, newVersion: data.version });
        return json(data, 200, h);
      }

      // ── DELETE ──
      if (method === "DELETE" && segments[1]) {
        const overrideId = segments[1];
        const uv = schemas.uuid.safeParse(overrideId);
        if (!uv.success) throw new AppError("Invalid override ID", 400, "INVALID_ID");

        const { error } = await db
          .from("region_overrides")
          .delete()
          .eq("id", overrideId);

        if (error) throw new AppError(error.message, 500, "DB_ERROR");

        log.info("Deleted region override", { overrideId });
        return json({ deleted: true }, 200, h);
      }
    }

    return errorResponse("Not found", 404, h, requestId, "NOT_FOUND");

  } catch (err) {
    return handleError(err, h, requestId, log);
  }
});
