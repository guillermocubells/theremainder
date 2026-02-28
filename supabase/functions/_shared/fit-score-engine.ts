/**
 * Fit Score Computation Engine
 *
 * Combines hardiness zone deltas, seasonal temperature extremes,
 * humidity compatibility, soil/drainage factors, and species thresholds
 * to produce a 0–100 score with factor breakdown and badges.
 *
 * Weight distribution (total = 100):
 *   - Hardiness zone fit:    30
 *   - Temperature extremes:  25
 *   - Humidity match:        15
 *   - Soil compatibility:    15
 *   - Drainage/water:        15
 */

// ── Types ──

export interface ClimateZoneData {
  system: string;
  code: string;
  label: string;
  min_temp_c: number | null;
  max_temp_c: number | null;
}

export interface ClimateThresholds {
  min_temp_c: number | null;
  frost_warning_temp_c: number | null;
  max_temp_c: number | null;
  heat_warning_temp_c: number | null;
  hardiness_zone_min: string | null;
  hardiness_zone_max: string | null;
}

export interface CareProfile {
  ideal_temp_min_c: number | null;
  ideal_temp_max_c: number | null;
  ideal_humidity_pct_min: number | null;
  ideal_humidity_pct_max: number | null;
  preferred_soil_type: string | null;
  preferred_soil_ph: string | null;
  light_requirement: string | null;
}

export interface WateringThreshold {
  climate_zone: string | null;
  season: string | null;
  drought_tolerance: string | null;
  overwater_sensitivity: string | null;
}

export interface AddressProfile {
  climate_zone: string | null;
  sun_exposure: string | null;
  soil_type: string | null;
  drainage: string | null;
  humidity_level: string | null;
  min_winter_temp_c: number | null;
  avg_annual_rainfall_mm: number | null;
  wind_exposure: string | null;
  altitude_m: number | null;
  frost_frequency: string | null;
  soil_ph: string | null;
}

export interface FitFactor {
  name: string;
  weight: number;
  score: number;        // 0–100 within this factor
  weighted: number;     // score * weight / 100
  detail: string;
}

export interface FitBadge {
  key: string;
  label: string;
  icon: string;
  sentiment: "positive" | "neutral" | "warning" | "danger";
}

export interface FitScoreResult {
  score: number;          // 0–100 final
  grade: string;          // A/B/C/D/F
  factors: FitFactor[];
  badges: FitBadge[];
  warnings: string[];
}

// ── Constants ──

const ZONE_ORDER = [
  "0a","0b","1a","1b","2a","2b","3a","3b","4a","4b",
  "5a","5b","6a","6b","7a","7b","8a","8b","9a","9b",
  "10a","10b","11a","11b","12a","12b","13a","13b",
];

const WEIGHTS = {
  hardiness: 30,
  temperature: 25,
  humidity: 15,
  soil: 15,
  water: 15,
};

// ── Helpers ──

function zoneIndex(code: string | null): number | null {
  if (!code) return null;
  const idx = ZONE_ORDER.indexOf(code.toLowerCase());
  return idx === -1 ? null : idx;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function grade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function toleranceScore(level: string | null | undefined): number {
  switch (level) {
    case "extreme": return 100;
    case "high": return 80;
    case "moderate": return 60;
    case "low": return 35;
    case "none": return 10;
    default: return 50; // unknown → neutral
  }
}

// ── Core computation ──

export function computeFitScore(
  regionZone: ClimateZoneData | null,
  thresholds: ClimateThresholds | null,
  careProfile: CareProfile | null,
  wateringThresholds: WateringThreshold[],
  addressProfile: AddressProfile | null,
): FitScoreResult {
  const factors: FitFactor[] = [];
  const badges: FitBadge[] = [];
  const warnings: string[] = [];

  // ─── 1. Hardiness zone fit (30 pts) ───
  const hardinessScore = computeHardinessFit(regionZone, thresholds, addressProfile, badges, warnings);
  factors.push({
    name: "hardiness_zone",
    weight: WEIGHTS.hardiness,
    score: hardinessScore,
    weighted: Math.round(hardinessScore * WEIGHTS.hardiness / 100),
    detail: hardinessScore >= 80
      ? "Zone is well-suited"
      : hardinessScore >= 50
        ? "Zone is marginal"
        : "Zone mismatch detected",
  });

  // ─── 2. Temperature extremes (25 pts) ───
  const tempScore = computeTemperatureFit(thresholds, careProfile, addressProfile, badges, warnings);
  factors.push({
    name: "temperature_extremes",
    weight: WEIGHTS.temperature,
    score: tempScore,
    weighted: Math.round(tempScore * WEIGHTS.temperature / 100),
    detail: tempScore >= 80
      ? "Temperature range compatible"
      : tempScore >= 50
        ? "Some seasonal stress expected"
        : "Significant temperature risk",
  });

  // ─── 3. Humidity match (15 pts) ───
  const humidityScore = computeHumidityFit(careProfile, addressProfile, badges);
  factors.push({
    name: "humidity",
    weight: WEIGHTS.humidity,
    score: humidityScore,
    weighted: Math.round(humidityScore * WEIGHTS.humidity / 100),
    detail: humidityScore >= 80 ? "Humidity compatible" : "Humidity mismatch",
  });

  // ─── 4. Soil compatibility (15 pts) ───
  const soilScore = computeSoilFit(careProfile, addressProfile, badges);
  factors.push({
    name: "soil",
    weight: WEIGHTS.soil,
    score: soilScore,
    weighted: Math.round(soilScore * WEIGHTS.soil / 100),
    detail: soilScore >= 80 ? "Soil well-matched" : "Soil adjustment may be needed",
  });

  // ─── 5. Drainage/water (15 pts) ───
  const waterScore = computeWaterFit(wateringThresholds, addressProfile, badges, warnings);
  factors.push({
    name: "water_drainage",
    weight: WEIGHTS.water,
    score: waterScore,
    weighted: Math.round(waterScore * WEIGHTS.water / 100),
    detail: waterScore >= 80 ? "Watering conditions suitable" : "Watering care needed",
  });

  // ─── Final score ───
  const totalScore = clamp(
    factors.reduce((sum, f) => sum + f.weighted, 0),
    0,
    100,
  );

  // Grade badge
  const g = grade(totalScore);
  badges.push({
    key: `grade_${g.toLowerCase()}`,
    label: `Grade ${g}`,
    icon: g === "A" ? "🏆" : g === "B" ? "✅" : g === "C" ? "⚠️" : g === "D" ? "🔶" : "❌",
    sentiment: g === "A" || g === "B" ? "positive" : g === "C" ? "neutral" : g === "D" ? "warning" : "danger",
  });

  return { score: totalScore, grade: g, factors, badges, warnings };
}

// ── Factor computations ──

function computeHardinessFit(
  regionZone: ClimateZoneData | null,
  thresholds: ClimateThresholds | null,
  address: AddressProfile | null,
  badges: FitBadge[],
  warnings: string[],
): number {
  // Use address climate_zone if available, otherwise regionZone code
  const locationZoneCode = address?.climate_zone ?? regionZone?.code ?? null;
  const speciesMinZone = thresholds?.hardiness_zone_min ?? null;
  const speciesMaxZone = thresholds?.hardiness_zone_max ?? null;

  if (!locationZoneCode || (!speciesMinZone && !speciesMaxZone)) {
    return 60; // Insufficient data → neutral
  }

  const locIdx = zoneIndex(locationZoneCode);
  const minIdx = zoneIndex(speciesMinZone);
  const maxIdx = zoneIndex(speciesMaxZone);

  if (locIdx === null) return 60;

  // If both min and max defined, check if location is within range
  if (minIdx !== null && maxIdx !== null) {
    if (locIdx >= minIdx && locIdx <= maxIdx) {
      // Within range — score based on how centered
      const rangeSize = maxIdx - minIdx;
      const center = (minIdx + maxIdx) / 2;
      const distFromCenter = Math.abs(locIdx - center);
      const normalized = rangeSize > 0 ? 1 - (distFromCenter / (rangeSize / 2 + 2)) : 1;
      const score = Math.round(75 + normalized * 25);
      badges.push({ key: "zone_match", label: "Zone Match", icon: "🌿", sentiment: "positive" });
      return clamp(score, 75, 100);
    }

    // Outside range — penalty based on distance
    const distOutside = locIdx < minIdx ? minIdx - locIdx : locIdx - maxIdx;
    if (distOutside <= 1) {
      badges.push({ key: "zone_marginal", label: "Marginal Zone", icon: "⚠️", sentiment: "neutral" });
      warnings.push(`Location zone ${locationZoneCode} is 1 step outside species range`);
      return 55;
    }
    if (distOutside <= 3) {
      badges.push({ key: "zone_risky", label: "Risky Zone", icon: "🔶", sentiment: "warning" });
      warnings.push(`Location zone ${locationZoneCode} is ${distOutside} steps outside species range`);
      return Math.max(20, 55 - distOutside * 12);
    }
    badges.push({ key: "zone_incompatible", label: "Zone Incompatible", icon: "❌", sentiment: "danger" });
    warnings.push(`Location zone ${locationZoneCode} is far outside species range (${distOutside} steps)`);
    return Math.max(0, 20 - (distOutside - 3) * 5);
  }

  // Only min defined (cold-hardy limit)
  if (minIdx !== null) {
    const delta = locIdx - minIdx;
    if (delta >= 0) return clamp(80 + Math.min(delta, 4) * 5, 80, 100);
    return clamp(60 + delta * 15, 0, 60);
  }

  // Only max defined (heat limit)
  if (maxIdx !== null) {
    const delta = maxIdx - locIdx;
    if (delta >= 0) return clamp(80 + Math.min(delta, 4) * 5, 80, 100);
    return clamp(60 + delta * 15, 0, 60);
  }

  return 60;
}

function computeTemperatureFit(
  thresholds: ClimateThresholds | null,
  careProfile: CareProfile | null,
  address: AddressProfile | null,
  badges: FitBadge[],
  warnings: string[],
): number {
  if (!address?.min_winter_temp_c && !thresholds && !careProfile) return 60;

  let score = 80; // Start optimistic

  const winterMin = address?.min_winter_temp_c;

  // Frost risk check
  if (winterMin !== null && winterMin !== undefined && thresholds?.min_temp_c !== null && thresholds?.min_temp_c !== undefined) {
    const frostMargin = winterMin - thresholds.min_temp_c;
    if (frostMargin < 0) {
      // Winter temps go below species kill threshold
      const penalty = Math.min(Math.abs(frostMargin) * 5, 50);
      score -= penalty;
      badges.push({ key: "frost_risk", label: "Frost Risk", icon: "❄️", sentiment: "danger" });
      warnings.push(`Winter minimum ${winterMin}°C is ${Math.abs(frostMargin).toFixed(1)}°C below species tolerance`);
    } else if (frostMargin < 3) {
      score -= 10;
      badges.push({ key: "frost_marginal", label: "Frost Marginal", icon: "🥶", sentiment: "warning" });
      warnings.push(`Winter minimum ${winterMin}°C is only ${frostMargin.toFixed(1)}°C above species tolerance`);
    }
  }

  // Frost warning check
  if (winterMin !== null && winterMin !== undefined && thresholds?.frost_warning_temp_c !== null && thresholds?.frost_warning_temp_c !== undefined) {
    if (winterMin <= thresholds.frost_warning_temp_c) {
      score -= 5;
      if (!warnings.some(w => w.includes("Frost"))) {
        warnings.push(`Frost warning: winter lows may stress this species`);
      }
    }
  }

  // Heat check via care profile ideal range
  if (careProfile?.ideal_temp_max_c !== null && careProfile?.ideal_temp_max_c !== undefined) {
    // If we had heat data from region, we'd check; for now use thresholds
    if (thresholds?.heat_warning_temp_c !== null && thresholds?.heat_warning_temp_c !== undefined) {
      // Heat warnings only penalize slightly — plants often tolerate short heat
      score -= 5;
      badges.push({ key: "heat_sensitive", label: "Heat Sensitive", icon: "🌡️", sentiment: "neutral" });
    }
  }

  // Ideal temp range overlap with care profile
  if (careProfile?.ideal_temp_min_c !== null && careProfile?.ideal_temp_min_c !== undefined &&
      careProfile?.ideal_temp_max_c !== null && careProfile?.ideal_temp_max_c !== undefined &&
      winterMin !== null && winterMin !== undefined) {
    if (winterMin >= careProfile.ideal_temp_min_c) {
      score += 5; // bonus: winter stays within ideal
    }
  }

  return clamp(score, 0, 100);
}

function computeHumidityFit(
  careProfile: CareProfile | null,
  address: AddressProfile | null,
  badges: FitBadge[],
): number {
  if (!careProfile || !address?.humidity_level) return 65;

  const idealMin = careProfile.ideal_humidity_pct_min;
  const idealMax = careProfile.ideal_humidity_pct_max;
  const level = address.humidity_level;

  // Map address humidity level to approximate %
  const humidityMap: Record<string, number> = { low: 30, medium: 55, high: 80 };
  const approxHumidity = humidityMap[level] ?? 55;

  if (idealMin === null && idealMax === null) return 65;

  let score = 80;
  if (idealMin !== null && idealMin !== undefined && approxHumidity < idealMin) {
    const gap = idealMin - approxHumidity;
    score -= Math.min(gap, 40);
    badges.push({ key: "low_humidity", label: "Low Humidity", icon: "💨", sentiment: "warning" });
  }
  if (idealMax !== null && idealMax !== undefined && approxHumidity > idealMax) {
    const gap = approxHumidity - idealMax;
    score -= Math.min(gap, 40);
    badges.push({ key: "high_humidity", label: "High Humidity", icon: "💧", sentiment: "warning" });
  }
  if (score >= 75) {
    badges.push({ key: "humidity_ok", label: "Humidity OK", icon: "💚", sentiment: "positive" });
  }

  return clamp(score, 0, 100);
}

function computeSoilFit(
  careProfile: CareProfile | null,
  address: AddressProfile | null,
  badges: FitBadge[],
): number {
  if (!careProfile || !address) return 65;

  let score = 75;

  // Soil type match
  if (careProfile.preferred_soil_type && address.soil_type) {
    const preferred = careProfile.preferred_soil_type.toLowerCase();
    const actual = address.soil_type.toLowerCase();
    if (preferred === actual || preferred === "any" || actual === "mixed") {
      score += 15;
      badges.push({ key: "soil_match", label: "Soil Match", icon: "🪴", sentiment: "positive" });
    } else if (
      (preferred === "loamy" && (actual === "sandy" || actual === "clay")) ||
      (preferred === "sandy" && actual === "loamy")
    ) {
      score += 5; // close enough
    } else {
      score -= 15;
      badges.push({ key: "soil_mismatch", label: "Soil Mismatch", icon: "🪨", sentiment: "warning" });
    }
  }

  // pH match
  if (careProfile.preferred_soil_ph && address.soil_ph && careProfile.preferred_soil_ph !== "any") {
    if (careProfile.preferred_soil_ph === address.soil_ph) {
      score += 10;
    } else {
      score -= 10;
    }
  }

  return clamp(score, 0, 100);
}

function computeWaterFit(
  wateringThresholds: WateringThreshold[],
  address: AddressProfile | null,
  badges: FitBadge[],
  warnings: string[],
): number {
  if (!wateringThresholds.length && !address) return 65;

  let score = 75;

  // Drainage compatibility
  if (address?.drainage) {
    const bestThreshold = wateringThresholds[0]; // use global/first if available
    if (bestThreshold) {
      const droughtTol = toleranceScore(bestThreshold.drought_tolerance);
      const overwaterSens = toleranceScore(bestThreshold.overwater_sensitivity);

      if (address.drainage === "fast" && droughtTol < 50) {
        score -= 15;
        badges.push({ key: "drought_risk", label: "Drought Risk", icon: "🏜️", sentiment: "warning" });
        warnings.push("Fast-draining soil with low drought tolerance");
      } else if (address.drainage === "poor" && overwaterSens > 60) {
        score -= 15;
        badges.push({ key: "overwater_risk", label: "Overwater Risk", icon: "🌊", sentiment: "warning" });
        warnings.push("Poor drainage with high overwater sensitivity");
      } else {
        score += 10;
      }
    } else {
      // No species water data, just lightly score drainage
      if (address.drainage === "medium") score += 5;
    }
  }

  // Rainfall vs watering needs
  if (address?.avg_annual_rainfall_mm) {
    const rain = address.avg_annual_rainfall_mm;
    if (rain < 300) {
      score -= 10;
      if (!badges.some(b => b.key === "drought_risk")) {
        badges.push({ key: "low_rainfall", label: "Low Rainfall", icon: "☀️", sentiment: "neutral" });
      }
    } else if (rain > 2000) {
      score -= 5; // excess rain
    } else {
      score += 5;
    }
  }

  // Wind exposure impact on water stress
  if (address?.wind_exposure === "high") {
    score -= 5;
    warnings.push("High wind exposure increases water stress");
  }

  return clamp(score, 0, 100);
}
