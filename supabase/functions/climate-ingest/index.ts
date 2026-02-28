/**
 * climate-ingest – Background worker to import/refresh climate_zones and region_overrides.
 *
 * Triggered via job_queue or direct POST (admin/service-role only).
 * Idempotent: uses UPSERT on (system,code) and checks for existing region mappings.
 *
 * POST body (optional):
 *   { "action": "full" | "zones_only" | "regions_only" }
 *   Default: "full"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ── USDA zones dataset ──
const USDA_ZONES = [
  { code: "0a", label: "Zone 0a (< -53.9 °C)", min: null, max: -53.9 },
  { code: "0b", label: "Zone 0b (-53.9 to -51.1 °C)", min: -53.9, max: -51.1 },
  { code: "1a", label: "Zone 1a (-51.1 to -48.3 °C)", min: -51.1, max: -48.3 },
  { code: "1b", label: "Zone 1b (-48.3 to -45.6 °C)", min: -48.3, max: -45.6 },
  { code: "2a", label: "Zone 2a (-45.6 to -42.8 °C)", min: -45.6, max: -42.8 },
  { code: "2b", label: "Zone 2b (-42.8 to -40.0 °C)", min: -42.8, max: -40.0 },
  { code: "3a", label: "Zone 3a (-40.0 to -37.2 °C)", min: -40.0, max: -37.2 },
  { code: "3b", label: "Zone 3b (-37.2 to -34.4 °C)", min: -37.2, max: -34.4 },
  { code: "4a", label: "Zone 4a (-34.4 to -31.7 °C)", min: -34.4, max: -31.7 },
  { code: "4b", label: "Zone 4b (-31.7 to -28.9 °C)", min: -31.7, max: -28.9 },
  { code: "5a", label: "Zone 5a (-28.9 to -26.1 °C)", min: -28.9, max: -26.1 },
  { code: "5b", label: "Zone 5b (-26.1 to -23.3 °C)", min: -26.1, max: -23.3 },
  { code: "6a", label: "Zone 6a (-23.3 to -20.6 °C)", min: -23.3, max: -20.6 },
  { code: "6b", label: "Zone 6b (-20.6 to -17.8 °C)", min: -20.6, max: -17.8 },
  { code: "7a", label: "Zone 7a (-17.8 to -15.0 °C)", min: -17.8, max: -15.0 },
  { code: "7b", label: "Zone 7b (-15.0 to -12.2 °C)", min: -15.0, max: -12.2 },
  { code: "8a", label: "Zone 8a (-12.2 to -9.4 °C)", min: -12.2, max: -9.4 },
  { code: "8b", label: "Zone 8b (-9.4 to -6.7 °C)", min: -9.4, max: -6.7 },
  { code: "9a", label: "Zone 9a (-6.7 to -3.9 °C)", min: -6.7, max: -3.9 },
  { code: "9b", label: "Zone 9b (-3.9 to -1.1 °C)", min: -3.9, max: -1.1 },
  { code: "10a", label: "Zone 10a (-1.1 to 1.7 °C)", min: -1.1, max: 1.7 },
  { code: "10b", label: "Zone 10b (1.7 to 4.4 °C)", min: 1.7, max: 4.4 },
  { code: "11a", label: "Zone 11a (4.4 to 7.2 °C)", min: 4.4, max: 7.2 },
  { code: "11b", label: "Zone 11b (7.2 to 10.0 °C)", min: 7.2, max: 10.0 },
  { code: "12a", label: "Zone 12a (10.0 to 12.8 °C)", min: 10.0, max: 12.8 },
  { code: "12b", label: "Zone 12b (12.8 to 15.6 °C)", min: 12.8, max: 15.6 },
  { code: "13a", label: "Zone 13a (15.6 to 18.3 °C)", min: 15.6, max: 18.3 },
  { code: "13b", label: "Zone 13b (> 18.3 °C)", min: 18.3, max: null },
];

const KOPPEN_ZONES = [
  { code: "Af", label: "Tropical Rainforest", desc: "Hot and wet year-round", min: 18, max: null, pMin: 1500, pMax: null },
  { code: "Am", label: "Tropical Monsoon", desc: "Hot with seasonal heavy rains", min: 18, max: null, pMin: 1000, pMax: 2500 },
  { code: "Aw", label: "Tropical Savanna", desc: "Hot with distinct wet/dry seasons", min: 18, max: null, pMin: 500, pMax: 1500 },
  { code: "BWh", label: "Hot Desert", desc: "Very hot and arid", min: 18, max: null, pMin: 0, pMax: 250 },
  { code: "BWk", label: "Cold Desert", desc: "Cold winters, very dry", min: -10, max: 18, pMin: 0, pMax: 250 },
  { code: "BSh", label: "Hot Semi-Arid", desc: "Hot with low rainfall", min: 18, max: null, pMin: 250, pMax: 500 },
  { code: "BSk", label: "Cold Semi-Arid", desc: "Cold winters, semi-dry", min: -10, max: 18, pMin: 250, pMax: 500 },
  { code: "Csa", label: "Hot-Summer Mediterranean", desc: "Dry hot summers, mild wet winters", min: -3, max: 22, pMin: 300, pMax: 900 },
  { code: "Csb", label: "Warm-Summer Mediterranean", desc: "Dry warm summers, mild wet winters", min: -3, max: 22, pMin: 400, pMax: 1000 },
  { code: "Cfa", label: "Humid Subtropical", desc: "Hot humid summers, mild winters", min: -3, max: 22, pMin: 750, pMax: 1500 },
  { code: "Cfb", label: "Oceanic", desc: "Mild year-round, no dry season", min: -3, max: 22, pMin: 600, pMax: 2000 },
  { code: "Cfc", label: "Subpolar Oceanic", desc: "Cool summers, mild winters", min: -3, max: 10, pMin: 800, pMax: 2500 },
  { code: "Dfa", label: "Hot-Summer Continental", desc: "Hot summers, cold winters", min: -30, max: 22, pMin: 500, pMax: 1200 },
  { code: "Dfb", label: "Warm-Summer Continental", desc: "Warm summers, cold winters", min: -30, max: 22, pMin: 500, pMax: 1200 },
  { code: "Dfc", label: "Subarctic", desc: "Short cool summers, very cold winters", min: -40, max: 10, pMin: 300, pMax: 800 },
  { code: "ET", label: "Tundra", desc: "Very cold, short growing season", min: -40, max: 10, pMin: 100, pMax: 500 },
  { code: "EF", label: "Ice Cap", desc: "Permanent ice/snow", min: null, max: -10, pMin: 0, pMax: 200 },
];

// ── EU region overrides (zone_code → country mappings) ──
const EU_REGIONS: { zone: string; country: string; label: string; notes: string }[] = [
  { zone: "8b", country: "ES", label: "España Norte", notes: "Northern Spain: Galicia, Asturias, Cantabria" },
  { zone: "9a", country: "ES", label: "España Central", notes: "Central plateau: Madrid, Castilla" },
  { zone: "9b", country: "ES", label: "España Mediterráneo", notes: "Mediterranean coast: Valencia, Cataluña" },
  { zone: "10a", country: "ES", label: "España Sur", notes: "Southern Spain: Andalucía" },
  { zone: "10b", country: "ES", label: "Canarias", notes: "Canary Islands coastal" },
  { zone: "11a", country: "ES", label: "Canarias Sur", notes: "Canary Islands southern coast" },
  { zone: "9a", country: "PT", label: "Portugal Norte", notes: "Northern Portugal" },
  { zone: "9b", country: "PT", label: "Portugal Centro", notes: "Central Portugal, Lisbon" },
  { zone: "10a", country: "PT", label: "Algarve", notes: "Southern Portugal" },
  { zone: "7b", country: "FR", label: "France Nord", notes: "Northern France, Paris basin" },
  { zone: "8a", country: "FR", label: "France Ouest", notes: "Atlantic coast, Brittany" },
  { zone: "8b", country: "FR", label: "France Sud-Ouest", notes: "Southwest France, Bordeaux" },
  { zone: "9a", country: "FR", label: "Côte d'Azur", notes: "French Riviera, Provence" },
  { zone: "7b", country: "IT", label: "Italia Nord", notes: "Po Valley, Milan" },
  { zone: "8b", country: "IT", label: "Italia Centro", notes: "Central Italy, Rome" },
  { zone: "9b", country: "IT", label: "Italia Sud", notes: "Southern Italy, Naples" },
  { zone: "10a", country: "IT", label: "Sicilia/Sardegna", notes: "Sicily and Sardinia" },
  { zone: "6b", country: "DE", label: "Deutschland Nord", notes: "Northern Germany" },
  { zone: "7a", country: "DE", label: "Deutschland Mitte", notes: "Central Germany" },
  { zone: "7b", country: "DE", label: "Deutschland Süd", notes: "Southern Germany, Bavaria" },
  { zone: "8a", country: "GB", label: "UK South", notes: "Southern England" },
  { zone: "7b", country: "GB", label: "UK Midlands", notes: "Central England, Wales" },
  { zone: "7a", country: "GB", label: "Scotland", notes: "Scotland, Northern England" },
  { zone: "8a", country: "NL", label: "Nederland", notes: "Netherlands" },
  { zone: "7b", country: "BE", label: "België", notes: "Belgium" },
  { zone: "8b", country: "GR", label: "Ελλάδα Βόρεια", notes: "Northern Greece" },
  { zone: "9b", country: "GR", label: "Ελλάδα Νότια", notes: "Southern Greece, islands" },
  { zone: "10a", country: "GR", label: "Κρήτη", notes: "Crete" },
  { zone: "6a", country: "PL", label: "Polska Północ", notes: "Northern Poland" },
  { zone: "6b", country: "PL", label: "Polska Południe", notes: "Southern Poland" },
  { zone: "6a", country: "DK", label: "Danmark", notes: "Denmark" },
  { zone: "5b", country: "SE", label: "Sverige Syd", notes: "Southern Sweden" },
  { zone: "4b", country: "SE", label: "Sverige Nord", notes: "Northern Sweden" },
  { zone: "6a", country: "NO", label: "Norge Sør", notes: "Southern Norway" },
  { zone: "3b", country: "NO", label: "Norge Nord", notes: "Northern Norway" },
  { zone: "5a", country: "FI", label: "Suomi Etelä", notes: "Southern Finland" },
  { zone: "3a", country: "FI", label: "Suomi Pohjoinen", notes: "Northern Finland" },
  { zone: "6b", country: "AT", label: "Österreich", notes: "Austria" },
  { zone: "7a", country: "CH", label: "Schweiz Mittelland", notes: "Swiss Plateau" },
  { zone: "6a", country: "CH", label: "Schweiz Alpen", notes: "Swiss Alps" },
  { zone: "8b", country: "IE", label: "Ireland", notes: "Ireland" },
];

// ── Ingestion logic ──

interface IngestResult {
  zones_upserted: number;
  regions_upserted: number;
  errors: string[];
}

async function ingestZones(
  client: ReturnType<typeof createClient>,
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  // USDA zones
  const usdaRows = USDA_ZONES.map((z) => ({
    system: "usda",
    code: z.code,
    label: z.label,
    min_temp_c: z.min,
    max_temp_c: z.max,
  }));

  const { error: usdaErr, count: usdaCount } = await client
    .from("climate_zones")
    .upsert(usdaRows, { onConflict: "system,code", ignoreDuplicates: false })
    .select("id");

  if (usdaErr) {
    errors.push(`USDA upsert: ${usdaErr.message}`);
  } else {
    count += usdaCount ?? usdaRows.length;
  }

  // Köppen zones
  const koppenRows = KOPPEN_ZONES.map((z) => ({
    system: "koppen",
    code: z.code,
    label: z.label,
    description: z.desc,
    min_temp_c: z.min,
    max_temp_c: z.max,
    precipitation_mm_min: z.pMin,
    precipitation_mm_max: z.pMax,
  }));

  const { error: koppenErr, count: koppenCount } = await client
    .from("climate_zones")
    .upsert(koppenRows, { onConflict: "system,code", ignoreDuplicates: false })
    .select("id");

  if (koppenErr) {
    errors.push(`Köppen upsert: ${koppenErr.message}`);
  } else {
    count += koppenCount ?? koppenRows.length;
  }

  return { count, errors };
}

async function ingestRegions(
  client: ReturnType<typeof createClient>,
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  // Build zone code → id lookup
  const { data: zones, error: lookupErr } = await client
    .from("climate_zones")
    .select("id, code")
    .eq("system", "usda");

  if (lookupErr || !zones) {
    return { count: 0, errors: [`Zone lookup failed: ${lookupErr?.message}`] };
  }

  const zoneMap = new Map(zones.map((z) => [z.code, z.id]));

  for (const r of EU_REGIONS) {
    const zoneId = zoneMap.get(r.zone);
    if (!zoneId) {
      errors.push(`Zone ${r.zone} not found for ${r.country}/${r.label}`);
      continue;
    }

    // Check if exists (idempotent)
    const { data: existing } = await client
      .from("region_overrides")
      .select("id")
      .eq("climate_zone_id", zoneId)
      .eq("country_code", r.country)
      .eq("local_label", r.label)
      .maybeSingle();

    if (existing) {
      // Update notes if changed
      await client
        .from("region_overrides")
        .update({ notes: r.notes })
        .eq("id", existing.id);
      count++;
      continue;
    }

    const { error: insertErr } = await client
      .from("region_overrides")
      .insert({
        climate_zone_id: zoneId,
        country_code: r.country,
        local_label: r.label,
        notes: r.notes,
        is_active: true,
      });

    if (insertErr) {
      errors.push(`Region ${r.country}/${r.label}: ${insertErr.message}`);
    } else {
      count++;
    }
  }

  return { count, errors };
}

// ── Handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("climate-ingest", req);
  const h = withCorrelationId(corsHeaders, requestId);

  try {
    // Auth: require service role or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Allow service role key directly OR validate admin user
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceKey;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims) {
        throw new AppError("Unauthorized", 401, "INVALID_TOKEN");
      }
      const userId = data.claims.sub as string;
      const { data: roleData } = await userClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
    }

    // Parse action
    let action = "full";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.action && ["full", "zones_only", "regions_only"].includes(body.action)) {
          action = body.action;
        }
      } catch {
        // empty body is fine, default to "full"
      }
    }

    log.info("Climate ingest started", { action });

    const client = createClient(supabaseUrl, serviceKey);
    const result: IngestResult = { zones_upserted: 0, regions_upserted: 0, errors: [] };

    if (action === "full" || action === "zones_only") {
      const zr = await ingestZones(client);
      result.zones_upserted = zr.count;
      result.errors.push(...zr.errors);
    }

    if (action === "full" || action === "regions_only") {
      const rr = await ingestRegions(client);
      result.regions_upserted = rr.count;
      result.errors.push(...rr.errors);
    }

    log.info("Climate ingest completed", {
      zones: result.zones_upserted,
      regions: result.regions_upserted,
      errorCount: result.errors.length,
    });

    return new Response(JSON.stringify(result), {
      status: result.errors.length > 0 ? 207 : 200,
      headers: { ...h, "Content-Type": "application/json" },
    });
  } catch (err) {
    return handleError(err, h, requestId, log);
  }
});
