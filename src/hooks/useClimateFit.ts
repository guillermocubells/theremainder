import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocationPreference } from "./useLocationPreference";

// ── Types ────────────────────────────────────────────────────────────

export interface ClimateFitFactors {
  temperature?: number;
  humidity?: number;
  hardiness?: number;
  soil?: number;
  exposure?: number;
  [key: string]: number | undefined;
}

export type HardinessBadge = "ok" | "borderline" | "risky" | "unknown";

export interface ClimateFitData {
  score: number;
  factors: ClimateFitFactors;
  sampleCount: number;
  confidence: "high" | "medium" | "low";
  hardinessBadge: HardinessBadge;
  warnings: ClimateFitWarning[];
  thresholds: {
    min_temp_c: number | null;
    max_temp_c: number | null;
    frost_warning_temp_c: number | null;
    heat_warning_temp_c: number | null;
    hardiness_zone_min: string | null;
    hardiness_zone_max: string | null;
  } | null;
  regionLabel: string | null;
}

export interface ClimateFitWarning {
  type: "frost" | "heat" | "hardiness_mismatch" | "low_data";
  severity: "info" | "warning" | "danger";
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function deriveConfidence(sampleCount: number): "high" | "medium" | "low" {
  if (sampleCount >= 10) return "high";
  if (sampleCount >= 3) return "medium";
  return "low";
}

function deriveHardinessBadge(
  plantZoneMin: string | null,
  plantZoneMax: string | null,
  locationClimate: { hardiness?: string } | null
): HardinessBadge {
  if (!plantZoneMin || !locationClimate?.hardiness) return "unknown";

  // Parse zone numbers (e.g., "8a" → 8, "10b" → 10)
  const parseZone = (z: string) => parseInt(z.replace(/[^0-9]/g, ""), 10);
  const locZone = parseZone(locationClimate.hardiness);
  const minZone = parseZone(plantZoneMin);
  const maxZone = plantZoneMax ? parseZone(plantZoneMax) : 13;

  if (isNaN(locZone) || isNaN(minZone)) return "unknown";

  if (locZone >= minZone && locZone <= maxZone) return "ok";
  if (locZone === minZone - 1 || locZone === maxZone + 1) return "borderline";
  return "risky";
}

function buildWarnings(
  thresholds: ClimateFitData["thresholds"],
  hardinessBadge: HardinessBadge,
  sampleCount: number,
  locationClimate: { zone?: string; hardiness?: string } | null
): ClimateFitWarning[] {
  const warnings: ClimateFitWarning[] = [];

  if (sampleCount < 3) {
    warnings.push({
      type: "low_data",
      severity: "info",
      message: "Pocos datos disponibles para esta combinación especie-ubicación. La puntuación puede ser aproximada.",
    });
  }

  if (hardinessBadge === "borderline") {
    warnings.push({
      type: "hardiness_mismatch",
      severity: "warning",
      message: `Tu zona de rusticidad (${locationClimate?.hardiness || "?"}) está en el límite del rango tolerado. Puede necesitar protección invernal.`,
    });
  } else if (hardinessBadge === "risky") {
    warnings.push({
      type: "hardiness_mismatch",
      severity: "danger",
      message: `Tu zona de rusticidad (${locationClimate?.hardiness || "?"}) está fuera del rango tolerado. El cultivo al exterior no es recomendable sin protección significativa.`,
    });
  }

  if (thresholds?.frost_warning_temp_c != null && thresholds.frost_warning_temp_c <= -5) {
    warnings.push({
      type: "frost",
      severity: "warning",
      message: `Sensible a heladas por debajo de ${thresholds.frost_warning_temp_c}°C. Proteger en invierno.`,
    });
  }

  if (thresholds?.heat_warning_temp_c != null && thresholds.heat_warning_temp_c <= 35) {
    warnings.push({
      type: "heat",
      severity: "warning",
      message: `Sensible al calor extremo por encima de ${thresholds.heat_warning_temp_c}°C. Proporcionar sombra.`,
    });
  }

  return warnings;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useClimateFit(plantId: string | undefined) {
  const { location } = useLocationPreference();

  return useQuery<ClimateFitData | null>({
    queryKey: ["climate-fit", plantId, location?.postalCode, location?.addressId],
    enabled: !!plantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!plantId) return null;

      // 1. Fetch thresholds
      const { data: thresholds } = await supabase
        .from("species_climate_thresholds")
        .select("*")
        .eq("plant_id", plantId)
        .maybeSingle();

      // 2. Fetch cached fit score (if user has an address)
      let fitRow: { score: number; factors: unknown } | null = null;
      if (location?.addressId) {
        const { data } = await supabase
          .from("fit_score_cache")
          .select("score, factors")
          .eq("plant_id", plantId)
          .eq("address_id", location.addressId)
          .eq("stale", false)
          .maybeSingle();
        fitRow = data;
      }

      // 3. Fetch aggregate stats
      const { data: agg } = await supabase
        .from("fit_score_agg")
        .select("avg_score, min_score, max_score, sample_count")
        .eq("species_id", plantId)
        .maybeSingle();

      const score = fitRow?.score ?? agg?.avg_score ?? 0;
      const factors = (fitRow?.factors ?? {}) as ClimateFitFactors;
      const sampleCount = agg?.sample_count ?? 0;
      const confidence = deriveConfidence(sampleCount);

      const hardinessBadge = deriveHardinessBadge(
        thresholds?.hardiness_zone_min ?? null,
        thresholds?.hardiness_zone_max ?? null,
        location?.climate ? { hardiness: location.climate.hardiness } : null
      );

      const warnings = buildWarnings(
        thresholds
          ? {
              min_temp_c: thresholds.min_temp_c,
              max_temp_c: thresholds.max_temp_c,
              frost_warning_temp_c: thresholds.frost_warning_temp_c,
              heat_warning_temp_c: thresholds.heat_warning_temp_c,
              hardiness_zone_min: thresholds.hardiness_zone_min,
              hardiness_zone_max: thresholds.hardiness_zone_max,
            }
          : null,
        hardinessBadge,
        sampleCount,
        location?.climate ? { zone: location.climate.zone, hardiness: location.climate.hardiness } : null
      );

      return {
        score,
        factors,
        sampleCount,
        confidence,
        hardinessBadge,
        warnings,
        thresholds: thresholds
          ? {
              min_temp_c: thresholds.min_temp_c,
              max_temp_c: thresholds.max_temp_c,
              frost_warning_temp_c: thresholds.frost_warning_temp_c,
              heat_warning_temp_c: thresholds.heat_warning_temp_c,
              hardiness_zone_min: thresholds.hardiness_zone_min,
              hardiness_zone_max: thresholds.hardiness_zone_max,
            }
          : null,
        regionLabel: location?.region || location?.city || null,
      };
    },
  });
}
