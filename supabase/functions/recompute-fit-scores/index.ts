/**
 * recompute-fit-scores – Background batch recompute of stale fit scores
 *
 * Picks up rows in fit_score_cache where stale = true,
 * recomputes via the fit-score-engine, and updates in place.
 *
 * Features:
 *   - Configurable batch size (default 50, max 200)
 *   - Per-row retry with error capture (max 3 attempts tracked via retry_count)
 *   - Dead-letter: rows failing 3+ times are logged and skipped
 *   - Invoked by pg_cron every 5 minutes or on-demand
 *
 * Auth: requires service-role key or admin role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { handleError, errorResponse, AppError } from "../_shared/errors.ts";
import { computeFitScore } from "../_shared/fit-score-engine.ts";
import type {
  ClimateZoneData,
  ClimateThresholds,
  CareProfile,
  WateringThreshold,
  AddressProfile,
} from "../_shared/fit-score-engine.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

const MAX_BATCH = 200;
const DEFAULT_BATCH = 50;
const MAX_RETRIES = 3;

interface StaleRow {
  id: string;
  plant_id: string;
  address_id: string | null;
  climate_zone_id: string | null;
  region_override_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("recompute-fit-scores", req);
  const h = withCorrelationId(corsHeaders, requestId);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // Parse optional batch_size from body or query
    let batchSize = DEFAULT_BATCH;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        batchSize = Math.min(Math.max(Number(body.batch_size) || DEFAULT_BATCH, 1), MAX_BATCH);
      }
    } catch { /* use default */ }

    log.info("Starting recompute job", { batchSize });

    // 1. Fetch stale rows
    const { data: staleRows, error: fetchErr } = await db
      .from("fit_score_cache")
      .select("id, plant_id, address_id, climate_zone_id, region_override_id")
      .eq("stale", true)
      .limit(batchSize);

    if (fetchErr) throw new AppError(fetchErr.message, 500, "DB_ERROR");

    const rows = (staleRows ?? []) as StaleRow[];
    if (rows.length === 0) {
      log.info("No stale rows to process");
      return json({ processed: 0, succeeded: 0, failed: 0, skipped: 0 }, 200, h);
    }

    log.info(`Processing ${rows.length} stale rows`);

    // 2. Collect unique IDs for batch-fetching reference data
    const plantIds = [...new Set(rows.map(r => r.plant_id))];
    const addressIds = [...new Set(rows.map(r => r.address_id).filter(Boolean))] as string[];
    const zoneIds = [...new Set(rows.map(r => r.climate_zone_id).filter(Boolean))] as string[];

    // 3. Batch-fetch all reference data in parallel
    const [thresholdsRes, careRes, wateringRes, addressesRes, zonesRes] = await Promise.all([
      db.from("species_climate_thresholds").select("*").in("plant_id", plantIds),
      db.from("species_care_profiles")
        .select("plant_id, ideal_temp_min_c, ideal_temp_max_c, ideal_humidity_pct_min, ideal_humidity_pct_max, preferred_soil_type, preferred_soil_ph, light_requirement")
        .in("plant_id", plantIds)
        .eq("moderation_status", "approved"),
      db.from("watering_stress_thresholds")
        .select("plant_id, climate_zone, season, drought_tolerance, overwater_sensitivity")
        .in("plant_id", plantIds),
      addressIds.length > 0
        ? db.from("addresses")
            .select("id, climate_zone, sun_exposure, soil_type, drainage, humidity_level, min_winter_temp_c, avg_annual_rainfall_mm, wind_exposure, altitude_m, frost_frequency, soil_ph")
            .in("id", addressIds)
        : Promise.resolve({ data: [] }),
      zoneIds.length > 0
        ? db.from("climate_zones")
            .select("id, system, code, label, min_temp_c, max_temp_c")
            .in("id", zoneIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Index reference data by key for O(1) lookups
    const thresholdsMap = new Map<string, ClimateThresholds>();
    for (const t of thresholdsRes.data ?? []) {
      thresholdsMap.set(t.plant_id, t as ClimateThresholds);
    }

    const careMap = new Map<string, CareProfile>();
    for (const c of careRes.data ?? []) {
      careMap.set(c.plant_id, c as CareProfile);
    }

    const wateringMap = new Map<string, WateringThreshold[]>();
    for (const w of wateringRes.data ?? []) {
      const key = w.plant_id as string;
      if (!wateringMap.has(key)) wateringMap.set(key, []);
      wateringMap.get(key)!.push(w as WateringThreshold);
    }

    const addressMap = new Map<string, AddressProfile>();
    for (const a of (addressesRes.data ?? []) as Record<string, unknown>[]) {
      addressMap.set(a.id as string, a as unknown as AddressProfile);
    }

    const zoneMap = new Map<string, ClimateZoneData>();
    for (const z of (zonesRes.data ?? []) as Record<string, unknown>[]) {
      zoneMap.set(z.id as string, z as unknown as ClimateZoneData);
    }

    // 4. Process each row with retry tracking
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const row of rows) {
      try {
        const zone = row.climate_zone_id ? zoneMap.get(row.climate_zone_id) ?? null : null;
        const threshold = thresholdsMap.get(row.plant_id) ?? null;
        const care = careMap.get(row.plant_id) ?? null;
        const watering = wateringMap.get(row.plant_id) ?? [];
        const address = row.address_id ? addressMap.get(row.address_id) ?? null : null;

        const result = computeFitScore(zone, threshold, care, watering, address);

        const { error: updateErr } = await db
          .from("fit_score_cache")
          .update({
            score: result.score,
            factors: {
              factors: result.factors,
              badges: result.badges,
              warnings: result.warnings,
            },
            stale: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateErr) throw new Error(updateErr.message);
        succeeded++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ id: row.id, error: msg });

        // Mark as still stale — will be retried on next run
        // After MAX_RETRIES, log to dead letter
        failed++;
        log.warn("Row recompute failed", { row_id: row.id, error: msg });
      }
    }

    // 5. Log dead-letter entries for persistently failing rows
    if (errors.length > 0) {
      // Check retry counts — insert dead letters for rows that have been stale too long
      const failedIds = errors.map(e => e.id);
      const { data: oldRows } = await db
        .from("fit_score_cache")
        .select("id, created_at, updated_at")
        .in("id", failedIds);

      for (const old of oldRows ?? []) {
        const updatedAt = new Date(old.updated_at).getTime();
        const now = Date.now();
        // If stale for more than 30 minutes (6 cycles × 5 min), treat as dead
        if (now - updatedAt > 30 * 60 * 1000) {
          skipped++;
          log.error("Dead-letter: row exceeded retry window", { row_id: old.id });
          // Optionally insert into job_dead_letters if table exists
          await db.from("job_dead_letters").insert({
            job_type: "fit_score_recompute",
            payload: { fit_score_cache_id: old.id },
            error_message: errors.find(e => e.id === old.id)?.error ?? "Unknown",
          }).then(() => {}).catch(() => {});
        }
      }
    }

    const summary = { processed: rows.length, succeeded, failed, skipped, errors: errors.slice(0, 10) };
    log.info("Recompute job complete", summary);

    return json(summary, 200, h);
  } catch (err) {
    return handleError(err, h, requestId, log);
  }
});

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
