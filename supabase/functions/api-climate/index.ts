/**
 * api-climate – Climate Fit, Care Profiles & Warnings API
 *
 * Routes:
 *   GET  /fit?speciesId=<uuid>&lat=<num>&lon=<num>      → fit score for species at location
 *   GET  /care/:speciesId                                → care profile + approved notes
 *   GET  /warnings/:speciesId?lat=<num>&lon=<num>        → hazard warnings for species at location
 *   POST /care-profiles      (admin)                     → create care profile
 *   PUT  /care-profiles/:id  (admin)                     → update care profile
 *   DELETE /care-profiles/:id (admin)                    → delete care profile
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";
import { validate, schemas, z } from "../_shared/validation.ts";
import { computeFitScore } from "../_shared/fit-score-engine.ts";
import type { ClimateZoneData, ClimateThresholds, CareProfile, WateringThreshold, AddressProfile } from "../_shared/fit-score-engine.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ── Validation schemas ──

const fitQuerySchema = z.object({
  speciesId: schemas.uuid,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  addressId: schemas.uuid.optional(),
});

const careProfileBodySchema = z.object({
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
});

const careProfileUpdateSchema = careProfileBodySchema.partial().omit({ plant_id: true });

const warningsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

// ── Helpers ──

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function parseRoute(url: URL): { path: string; segments: string[] } {
  const raw = url.pathname.replace(/^\/api-climate\/?/, "").replace(/\/$/, "");
  return { path: raw, segments: raw.split("/").filter(Boolean) };
}

async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  headers: Record<string, string>,
  requestId: string,
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

  // Check admin role
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

  const { log, requestId } = createLogger("api-climate", req);
  const h = withCorrelationId(corsHeaders, requestId);

  try {
    const url = new URL(req.url);
    const { segments } = parseRoute(url);
    const method = req.method;
    const params = url.searchParams;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ────────────────────────────────────────
    // GET /fit?speciesId=&lat=&lon=
    // ────────────────────────────────────────
    if (method === "GET" && segments[0] === "fit") {
      const v = validate(fitQuerySchema, {
        speciesId: params.get("speciesId"),
        lat: params.get("lat") ?? undefined,
        lon: params.get("lon") ?? undefined,
        addressId: params.get("addressId") ?? undefined,
      }, h);
      if (v.error) return v.error;
      const { speciesId, lat, lon, addressId } = v.data;

      log.info("Fit score request", { speciesId, lat, lon, addressId });

      // 1. Load address profile if provided
      let addressProfile: AddressProfile | null = null;
      if (addressId) {
        const { data } = await serviceClient
          .from("addresses")
          .select("climate_zone, sun_exposure, soil_type, drainage, humidity_level, min_winter_temp_c, avg_annual_rainfall_mm, wind_exposure, altitude_m, frost_frequency, soil_ph")
          .eq("id", addressId)
          .maybeSingle();
        addressProfile = data as AddressProfile | null;
      }

      // 2. Find matching region override by lat/lon
      let region = null;
      if (lat !== undefined && lon !== undefined) {
        const { data: regions } = await serviceClient
          .from("region_overrides")
          .select("id, climate_zone_id, country_code, local_label")
          .lte("lat_min", lat)
          .gte("lat_max", lat)
          .lte("lon_min", lon)
          .gte("lon_max", lon)
          .eq("is_active", true)
          .limit(1);
        region = regions?.[0] ?? null;
      }

      // 3. Parallel fetch: thresholds, care profile, watering, zone info, cache, aggregate
      const climateZoneId = region?.climate_zone_id ?? null;

      const [thresholdsRes, careRes, wateringRes, zoneRes, cacheRes, aggRes] = await Promise.all([
        serviceClient
          .from("species_climate_thresholds")
          .select("*")
          .eq("plant_id", speciesId)
          .maybeSingle(),
        serviceClient
          .from("species_care_profiles")
          .select("ideal_temp_min_c, ideal_temp_max_c, ideal_humidity_pct_min, ideal_humidity_pct_max, preferred_soil_type, preferred_soil_ph, light_requirement")
          .eq("plant_id", speciesId)
          .eq("moderation_status", "approved")
          .maybeSingle(),
        serviceClient
          .from("watering_stress_thresholds")
          .select("climate_zone, season, drought_tolerance, overwater_sensitivity")
          .eq("plant_id", speciesId),
        climateZoneId
          ? serviceClient
              .from("climate_zones")
              .select("system, code, label, min_temp_c, max_temp_c")
              .eq("id", climateZoneId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        climateZoneId
          ? serviceClient
              .from("fit_score_cache")
              .select("score, factors, updated_at")
              .eq("plant_id", speciesId)
              .eq("climate_zone_id", climateZoneId)
              .eq("stale", false)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        climateZoneId
          ? serviceClient
              .from("fit_score_agg")
              .select("avg_score, min_score, max_score, sample_count")
              .eq("species_id", speciesId)
              .eq("region_id", climateZoneId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const thresholds = thresholdsRes.data as ClimateThresholds | null;
      const careProfile = careRes.data as CareProfile | null;
      const wateringThresholds = (wateringRes.data ?? []) as WateringThreshold[];
      const zoneInfo = zoneRes.data as ClimateZoneData | null;
      const cached = cacheRes.data;
      const aggregate = aggRes.data;

      // 4. Compute live fit score
      const computed = computeFitScore(
        zoneInfo,
        thresholds,
        careProfile,
        wateringThresholds,
        addressProfile,
      );

      // 5. Cache the result if we have a zone
      if (climateZoneId && addressId) {
        await serviceClient
          .from("fit_score_cache")
          .upsert({
            plant_id: speciesId,
            address_id: addressId,
            climate_zone_id: climateZoneId,
            region_override_id: region?.id ?? null,
            score: computed.score,
            factors: { factors: computed.factors, badges: computed.badges, warnings: computed.warnings },
            stale: false,
          }, { onConflict: "plant_id,address_id" });
      }

      return json({
        species_id: speciesId,
        location: lat !== undefined ? { lat, lon } : null,
        address_id: addressId ?? null,
        region: region ? {
          country_code: region.country_code,
          local_label: region.local_label,
          climate_zone: zoneInfo,
        } : null,
        computed,
        cached: cached ? {
          score: cached.score,
          factors: cached.factors,
          updated_at: cached.updated_at,
        } : null,
        aggregate,
        climate_thresholds: thresholds,
      }, 200, h);
    }

    // ────────────────────────────────────────
    // GET /care/:speciesId
    // ────────────────────────────────────────
    if (method === "GET" && segments[0] === "care" && segments[1]) {
      const speciesId = segments[1];
      const uuidResult = schemas.uuid.safeParse(speciesId);
      if (!uuidResult.success) {
        throw new AppError("Invalid speciesId", 400, "INVALID_SPECIES_ID");
      }

      log.info("Care profile request", { speciesId });

      const { data: profile, error: profileErr } = await serviceClient
        .from("species_care_profiles")
        .select("*")
        .eq("plant_id", speciesId)
        .eq("moderation_status", "approved")
        .maybeSingle();

      let notes: unknown[] = [];
      if (profile) {
        const { data } = await serviceClient
          .from("care_notes")
          .select("id, locale, category, title, body, region_verified, country_code, climate_zone_code, hardiness_zone, season, source_url, source_title, source_type, upvote_count, downvote_count, created_at")
          .eq("care_profile_id", profile.id)
          .eq("moderation_status", "approved")
          .order("upvote_count", { ascending: false })
          .limit(50);
        notes = data ?? [];
      }

      return json({ profile, notes }, 200, h);
    }

    // ────────────────────────────────────────
    // GET /warnings/:speciesId?lat=&lon=
    // ────────────────────────────────────────
    if (method === "GET" && segments[0] === "warnings" && segments[1]) {
      const speciesId = segments[1];
      const uuidResult = schemas.uuid.safeParse(speciesId);
      if (!uuidResult.success) {
        throw new AppError("Invalid speciesId", 400, "INVALID_SPECIES_ID");
      }

      const wv = validate(warningsQuerySchema, {
        lat: params.get("lat") ?? undefined,
        lon: params.get("lon") ?? undefined,
      }, h);
      if (wv.error) return wv.error;

      log.info("Warnings request", { speciesId, ...wv.data });

      // Parallel fetch
      const [toxicity, climate, watering] = await Promise.all([
        serviceClient
          .from("toxicity_warnings")
          .select("*")
          .eq("plant_id", speciesId)
          .maybeSingle(),
        serviceClient
          .from("species_climate_thresholds")
          .select("*")
          .eq("plant_id", speciesId)
          .maybeSingle(),
        serviceClient
          .from("watering_stress_thresholds")
          .select("*")
          .eq("plant_id", speciesId),
      ]);

      // Region context if lat/lon provided
      let regionContext = null;
      if (wv.data.lat !== undefined && wv.data.lon !== undefined) {
        const { data: regions } = await serviceClient
          .from("region_overrides")
          .select("id, climate_zone_id, country_code, local_label")
          .lte("lat_min", wv.data.lat)
          .gte("lat_max", wv.data.lat)
          .lte("lon_min", wv.data.lon)
          .gte("lon_max", wv.data.lon)
          .eq("is_active", true)
          .limit(1);

        if (regions?.[0]?.climate_zone_id) {
          const { data: zone } = await serviceClient
            .from("climate_zones")
            .select("system, code, label, min_temp_c, max_temp_c")
            .eq("id", regions[0].climate_zone_id)
            .maybeSingle();
          regionContext = {
            country_code: regions[0].country_code,
            local_label: regions[0].local_label,
            climate_zone: zone,
          };
        }
      }

      return json({
        species_id: speciesId,
        toxicity: toxicity.data,
        climate_thresholds: climate.data,
        watering_thresholds: watering.data ?? [],
        region: regionContext,
      }, 200, h);
    }

    // ────────────────────────────────────────
    // Fallback (admin CRUD moved to api-admin-climate)
    // ────────────────────────────────────────
    return errorResponse("Not found", 404, h, requestId, "NOT_FOUND");

  } catch (err) {
    return handleError(err, h, requestId, log);
  }
});
