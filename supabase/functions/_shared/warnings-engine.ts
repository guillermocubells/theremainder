/**
 * Warnings Evaluation Engine
 *
 * Evaluates frost, heat, toxicity, watering stress, and seasonal
 * hazard warnings for a species at a given location.
 *
 * Returns typed Warning objects with severity, category,
 * actionable messages, and seasonality windows.
 */

// ── Types ──

export type WarningSeverity = "info" | "caution" | "warning" | "critical";
export type WarningCategory =
  | "frost"
  | "heat"
  | "toxicity"
  | "drought"
  | "overwater"
  | "wind"
  | "altitude"
  | "seasonal";

export interface SeasonWindow {
  months: number[];     // 1-12
  label: string;        // e.g. "Dec–Feb"
  hemisphere: "N" | "S" | "any";
}

export interface Warning {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  title: string;
  message: string;
  season?: SeasonWindow;
  meta?: Record<string, unknown>;
}

export interface ClimateThresholds {
  min_temp_c: number | null;
  frost_warning_temp_c: number | null;
  max_temp_c: number | null;
  heat_warning_temp_c: number | null;
  hardiness_zone_min: string | null;
  hardiness_zone_max: string | null;
  notes: string | null;
}

export interface ToxicityData {
  toxic_to_pets: boolean;
  toxic_to_children: boolean;
  toxic_to_humans: boolean;
  severity: string | null;
  toxic_parts: string[] | null;
  symptoms: string | null;
  first_aid: string | null;
}

export interface WateringThreshold {
  climate_zone: string | null;
  season: string | null;
  min_days_between_watering: number | null;
  max_days_between_watering: number | null;
  ideal_soil_moisture_pct: number | null;
  drought_tolerance: string | null;
  overwater_sensitivity: string | null;
  notes: string | null;
}

export interface LocationContext {
  min_winter_temp_c?: number | null;
  humidity_level?: string | null;
  wind_exposure?: string | null;
  altitude_m?: number | null;
  frost_frequency?: string | null;
  drainage?: string | null;
  avg_annual_rainfall_mm?: number | null;
  climate_zone_min_temp_c?: number | null;
  climate_zone_max_temp_c?: number | null;
  country_code?: string | null;
}

// ── Season helpers ──

const NORTHERN_WINTER: SeasonWindow = { months: [12, 1, 2], label: "Dec–Feb", hemisphere: "N" };
const NORTHERN_SUMMER: SeasonWindow = { months: [6, 7, 8], label: "Jun–Aug", hemisphere: "N" };
const SOUTHERN_WINTER: SeasonWindow = { months: [6, 7, 8], label: "Jun–Aug", hemisphere: "S" };
const SOUTHERN_SUMMER: SeasonWindow = { months: [12, 1, 2], label: "Dec–Feb", hemisphere: "S" };
const SPRING_N: SeasonWindow = { months: [3, 4, 5], label: "Mar–May", hemisphere: "N" };
const AUTUMN_N: SeasonWindow = { months: [9, 10, 11], label: "Sep–Nov", hemisphere: "N" };

const SOUTHERN_COUNTRIES = new Set([
  "AR", "AU", "BR", "CL", "NZ", "ZA", "UY", "PY", "BO", "PE",
]);

function getHemisphere(countryCode: string | null | undefined): "N" | "S" {
  if (!countryCode) return "N";
  return SOUTHERN_COUNTRIES.has(countryCode.toUpperCase()) ? "S" : "N";
}

function winterSeason(h: "N" | "S"): SeasonWindow {
  return h === "N" ? NORTHERN_WINTER : SOUTHERN_WINTER;
}
function summerSeason(h: "N" | "S"): SeasonWindow {
  return h === "N" ? NORTHERN_SUMMER : SOUTHERN_SUMMER;
}

function seasonFromString(s: string | null, h: "N" | "S"): SeasonWindow | undefined {
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower === "winter") return winterSeason(h);
  if (lower === "summer") return summerSeason(h);
  if (lower === "spring") return h === "N" ? SPRING_N : { months: [9, 10, 11], label: "Sep–Nov", hemisphere: "S" };
  if (lower === "autumn" || lower === "fall") return h === "N" ? AUTUMN_N : { months: [3, 4, 5], label: "Mar–May", hemisphere: "S" };
  return undefined;
}

// ── Main evaluation ──

export function evaluateWarnings(
  thresholds: ClimateThresholds | null,
  toxicity: ToxicityData | null,
  wateringThresholds: WateringThreshold[],
  location: LocationContext,
): Warning[] {
  const warnings: Warning[] = [];
  const hemi = getHemisphere(location.country_code);

  // ── Frost warnings ──
  evaluateFrost(thresholds, location, hemi, warnings);

  // ── Heat warnings ──
  evaluateHeat(thresholds, location, hemi, warnings);

  // ── Toxicity warnings ──
  evaluateToxicity(toxicity, warnings);

  // ── Watering / drought / overwater warnings ──
  evaluateWatering(wateringThresholds, location, hemi, warnings);

  // ── Wind stress ──
  evaluateWind(location, warnings);

  // ── Altitude ──
  evaluateAltitude(location, warnings);

  // Sort: critical first, then warning, caution, info
  const severityOrder: Record<WarningSeverity, number> = { critical: 0, warning: 1, caution: 2, info: 3 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
}

// ── Frost evaluation ──

function evaluateFrost(
  thresholds: ClimateThresholds | null,
  loc: LocationContext,
  hemi: "N" | "S",
  out: Warning[],
) {
  const winterMin = loc.min_winter_temp_c;
  if (winterMin === null || winterMin === undefined) return;

  const winter = winterSeason(hemi);

  // Kill threshold
  if (thresholds?.min_temp_c !== null && thresholds?.min_temp_c !== undefined) {
    const margin = winterMin - thresholds.min_temp_c;
    if (margin < -5) {
      out.push({
        id: "frost_lethal",
        category: "frost",
        severity: "critical",
        title: "Lethal frost risk",
        message: `Winter lows (${winterMin}°C) are ${Math.abs(margin).toFixed(1)}°C below the species kill threshold (${thresholds.min_temp_c}°C). This plant will not survive outdoors without heavy protection.`,
        season: winter,
        meta: { winter_min: winterMin, kill_temp: thresholds.min_temp_c, margin },
      });
    } else if (margin < 0) {
      out.push({
        id: "frost_severe",
        category: "frost",
        severity: "warning",
        title: "Severe frost risk",
        message: `Winter lows (${winterMin}°C) dip below the species tolerance (${thresholds.min_temp_c}°C). Move indoors or provide frost protection during ${winter.label}.`,
        season: winter,
        meta: { winter_min: winterMin, kill_temp: thresholds.min_temp_c, margin },
      });
    } else if (margin < 3) {
      out.push({
        id: "frost_marginal",
        category: "frost",
        severity: "caution",
        title: "Marginal frost tolerance",
        message: `Winter lows (${winterMin}°C) are only ${margin.toFixed(1)}°C above the threshold. Unexpected cold snaps could cause damage. Consider a sheltered spot.`,
        season: winter,
        meta: { winter_min: winterMin, kill_temp: thresholds.min_temp_c, margin },
      });
    }
  }

  // Frost warning threshold (stress, not kill)
  if (thresholds?.frost_warning_temp_c !== null && thresholds?.frost_warning_temp_c !== undefined) {
    if (winterMin <= thresholds.frost_warning_temp_c && !out.some(w => w.id.startsWith("frost_"))) {
      out.push({
        id: "frost_stress",
        category: "frost",
        severity: "caution",
        title: "Cold stress expected",
        message: `Winter temperatures may reach ${winterMin}°C, triggering cold stress below ${thresholds.frost_warning_temp_c}°C. Growth may slow or leaves may discolor.`,
        season: winter,
      });
    }
  }

  // Frost frequency amplifier
  if (loc.frost_frequency === "frequent" && out.some(w => w.category === "frost")) {
    out.push({
      id: "frost_freq_high",
      category: "frost",
      severity: "info",
      title: "Frequent frost events",
      message: "This location experiences frequent frosts, compounding cold damage risk. Sustained protection recommended throughout winter.",
      season: winter,
    });
  }
}

// ── Heat evaluation ──

function evaluateHeat(
  thresholds: ClimateThresholds | null,
  loc: LocationContext,
  hemi: "N" | "S",
  out: Warning[],
) {
  const summer = summerSeason(hemi);
  const zoneMax = loc.climate_zone_max_temp_c;

  if (thresholds?.heat_warning_temp_c !== null && thresholds?.heat_warning_temp_c !== undefined) {
    // Use zone max temp as proxy for summer highs
    if (zoneMax !== null && zoneMax !== undefined) {
      const margin = zoneMax - thresholds.heat_warning_temp_c;
      if (margin > 10) {
        out.push({
          id: "heat_extreme",
          category: "heat",
          severity: "critical",
          title: "Extreme heat risk",
          message: `Summer highs (~${zoneMax}°C) far exceed the heat warning threshold (${thresholds.heat_warning_temp_c}°C). Provide full shade and misting during ${summer.label}.`,
          season: summer,
          meta: { zone_max: zoneMax, heat_warning: thresholds.heat_warning_temp_c },
        });
      } else if (margin > 3) {
        out.push({
          id: "heat_stress",
          category: "heat",
          severity: "warning",
          title: "Heat stress risk",
          message: `Summer temperatures (~${zoneMax}°C) exceed the species heat tolerance (${thresholds.heat_warning_temp_c}°C). Provide afternoon shade during ${summer.label}.`,
          season: summer,
          meta: { zone_max: zoneMax, heat_warning: thresholds.heat_warning_temp_c },
        });
      } else if (margin > 0) {
        out.push({
          id: "heat_caution",
          category: "heat",
          severity: "caution",
          title: "Summer heat advisory",
          message: `Summer peaks may approach ${thresholds.heat_warning_temp_c}°C. Monitor for wilting and increase watering during hot spells.`,
          season: summer,
        });
      }
    }
  }

  // Max absolute temperature (kill temp)
  if (thresholds?.max_temp_c !== null && thresholds?.max_temp_c !== undefined && zoneMax !== null && zoneMax !== undefined) {
    if (zoneMax > thresholds.max_temp_c) {
      if (!out.some(w => w.id === "heat_extreme")) {
        out.push({
          id: "heat_lethal",
          category: "heat",
          severity: "critical",
          title: "Lethal heat threshold exceeded",
          message: `Zone maximum (~${zoneMax}°C) exceeds the species maximum survivable temperature (${thresholds.max_temp_c}°C).`,
          season: summer,
        });
      }
    }
  }
}

// ── Toxicity evaluation ──

function evaluateToxicity(toxicity: ToxicityData | null, out: Warning[]) {
  if (!toxicity) return;

  const targets: string[] = [];
  if (toxicity.toxic_to_pets) targets.push("pets");
  if (toxicity.toxic_to_children) targets.push("children");
  if (toxicity.toxic_to_humans) targets.push("humans");

  if (targets.length === 0) return;

  const severityMap: Record<string, WarningSeverity> = {
    severe: "critical",
    moderate: "warning",
    mild: "caution",
  };
  const severity = severityMap[toxicity.severity?.toLowerCase() ?? ""] ?? "warning";

  const parts = toxicity.toxic_parts?.length
    ? ` Toxic parts: ${toxicity.toxic_parts.join(", ")}.`
    : "";
  const symptoms = toxicity.symptoms ? ` Symptoms: ${toxicity.symptoms}.` : "";
  const firstAid = toxicity.first_aid ? ` First aid: ${toxicity.first_aid}.` : "";

  out.push({
    id: "toxicity_general",
    category: "toxicity",
    severity,
    title: `Toxic to ${targets.join(", ")}`,
    message: `This species is toxic to ${targets.join(" and ")}.${parts}${symptoms}${firstAid}`,
    meta: {
      toxic_to: targets,
      severity: toxicity.severity,
      toxic_parts: toxicity.toxic_parts,
    },
  });

  // Extra warning specifically for pets if present
  if (toxicity.toxic_to_pets) {
    out.push({
      id: "toxicity_pets",
      category: "toxicity",
      severity: severity === "critical" ? "critical" : "warning",
      title: "Pet safety warning",
      message: "Keep this plant out of reach of cats and dogs. Ingestion can cause serious illness.",
      meta: { toxic_to: ["pets"] },
    });
  }
}

// ── Watering stress evaluation ──

function evaluateWatering(
  thresholds: WateringThreshold[],
  loc: LocationContext,
  hemi: "N" | "S",
  out: Warning[],
) {
  if (!thresholds.length) return;

  for (const t of thresholds) {
    const season = seasonFromString(t.season, hemi);

    // Drought risk
    if (t.drought_tolerance) {
      const tol = t.drought_tolerance.toLowerCase();
      if ((tol === "none" || tol === "low") && loc.drainage === "fast") {
        out.push({
          id: `drought_${t.season ?? "general"}`,
          category: "drought",
          severity: tol === "none" ? "critical" : "warning",
          title: season ? `Drought risk (${season.label})` : "Drought risk",
          message: `Low drought tolerance combined with fast-draining soil. ${season ? `During ${season.label}, ` : ""}water frequently to prevent desiccation.`,
          season,
          meta: { drought_tolerance: tol, drainage: loc.drainage },
        });
      }

      if ((tol === "none" || tol === "low") && loc.avg_annual_rainfall_mm !== null && loc.avg_annual_rainfall_mm !== undefined && loc.avg_annual_rainfall_mm < 400) {
        if (!out.some(w => w.id === `drought_${t.season ?? "general"}`)) {
          out.push({
            id: `drought_low_rain_${t.season ?? "general"}`,
            category: "drought",
            severity: "warning",
            title: "Low rainfall + low drought tolerance",
            message: `Annual rainfall (~${loc.avg_annual_rainfall_mm}mm) is low for a species with ${tol} drought tolerance. Supplemental irrigation required.`,
            season,
            meta: { rainfall: loc.avg_annual_rainfall_mm, drought_tolerance: tol },
          });
        }
      }
    }

    // Overwater risk
    if (t.overwater_sensitivity) {
      const sens = t.overwater_sensitivity.toLowerCase();
      if ((sens === "extreme" || sens === "high") && loc.drainage === "poor") {
        out.push({
          id: `overwater_${t.season ?? "general"}`,
          category: "overwater",
          severity: sens === "extreme" ? "critical" : "warning",
          title: season ? `Root rot risk (${season.label})` : "Root rot risk",
          message: `High overwater sensitivity with poor drainage. ${season ? `In ${season.label}, ` : ""}ensure pots have drainage holes and avoid waterlogging.`,
          season,
          meta: { overwater_sensitivity: sens, drainage: loc.drainage },
        });
      }

      if ((sens === "extreme" || sens === "high") && loc.avg_annual_rainfall_mm !== null && loc.avg_annual_rainfall_mm !== undefined && loc.avg_annual_rainfall_mm > 1800) {
        out.push({
          id: `overwater_rain_${t.season ?? "general"}`,
          category: "overwater",
          severity: "caution",
          title: "High rainfall area",
          message: `Annual rainfall (~${loc.avg_annual_rainfall_mm}mm) is high for a species sensitive to overwatering. Ensure excellent drainage.`,
          season,
        });
      }
    }

    // Seasonal watering guidance
    if (t.min_days_between_watering !== null && t.max_days_between_watering !== null && t.season) {
      out.push({
        id: `watering_schedule_${t.season}`,
        category: "seasonal",
        severity: "info",
        title: `Watering schedule (${t.season})`,
        message: `During ${t.season}: water every ${t.min_days_between_watering}–${t.max_days_between_watering} days.${t.ideal_soil_moisture_pct ? ` Target soil moisture: ${t.ideal_soil_moisture_pct}%.` : ""}${t.notes ? ` ${t.notes}` : ""}`,
        season: seasonFromString(t.season, hemi),
      });
    }
  }
}

// ── Wind stress ──

function evaluateWind(loc: LocationContext, out: Warning[]) {
  if (loc.wind_exposure === "high") {
    out.push({
      id: "wind_stress",
      category: "wind",
      severity: "caution",
      title: "High wind exposure",
      message: "Strong winds increase transpiration and can cause physical damage. Use windbreaks or stake tall plants.",
    });
  }
}

// ── Altitude ──

function evaluateAltitude(loc: LocationContext, out: Warning[]) {
  if (loc.altitude_m !== null && loc.altitude_m !== undefined && loc.altitude_m > 1500) {
    out.push({
      id: "altitude_high",
      category: "altitude",
      severity: "info",
      title: "High altitude location",
      message: `At ${loc.altitude_m}m elevation, expect stronger UV, wider day/night temperature swings, and potentially thinner soil. Adjust care accordingly.`,
      meta: { altitude_m: loc.altitude_m },
    });
  }
}
