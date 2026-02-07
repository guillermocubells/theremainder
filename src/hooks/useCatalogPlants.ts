import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plant } from "@/data/plants";

/**
 * Maps database water_level enum to the UI label
 */
const mapWater = (w: string | null): Plant["waterNeeds"] => {
  if (!w) return undefined;
  switch (w) {
    case "low": return "Baja";
    case "medium": return "Moderada";
    case "high": return "Alta";
    default: return "Moderada";
  }
};

/**
 * Maps database exposure array to a single UI light string
 * DB stores: sol, semisol, sombra, semisombra
 */
const mapLight = (exposure: string[] | null): string => {
  if (!exposure || exposure.length === 0) return "Semisol";
  const first = exposure[0];
  switch (first) {
    case "sol": return "Soleada";
    case "semisol": return "Semisol";
    case "sombra": return "Sombreada";
    case "semisombra": return "Semisombra";
    // Legacy English values
    case "full_sun": return "Soleada";
    case "partial_shade": return "Semisol";
    case "shade": return "Sombreada";
    case "full_shade": return "Sombreada";
    default: return first; // Pass through unknown values
  }
};

/**
 * Maps database growth_rate to UI label
 */
const mapGrowthRate = (g: string | null): string => {
  if (!g) return "Medio";
  switch (g.toLowerCase()) {
    case "slow": return "Lento";
    case "medium": return "Medio";
    case "fast": return "Rápido";
    default: return g;
  }
};

/**
 * Maps database plant_type to plantGroup
 * DB enum: palm, fern, cycad, tree, shrub, succulent, grass, other
 */
const mapPlantGroup = (t: string | null): Plant["plantGroup"] => {
  if (!t) return undefined;
  switch (t) {
    case "palm": return "Palmeras";
    case "fern": return "Helechos arbóreos";
    case "cycad": return "Cícadas";
    case "tree": return "Árboles ornamentales";
    case "shrub": return "Arbustos ornamentales";
    case "succulent": return "Suculentas";
    case "grass": return "Hierbas";
    case "bamboo": return "Bambús";
    case "bromeliad": return "Bromeliáceas";
    case "heliconia": return "Heliconias";
    case "strelitzia": return "Estrelicias";
    case "ginger": return "Jengibres";
    case "banana": return "Plátanos";
    case "agave": return "Agaves y yucas";
    case "aroid": return "Aráceas";
    case "cactus": return "Cactus";
    case "conifer": return "Coníferas";
    case "perennial": return "Perennes";
    case "other": return undefined;
    default: return undefined;
  }
};

/**
 * Maps database rarity to ornamentalValue
 */
const mapOrnamental = (r: string | null): Plant["ornamentalValue"] => {
  if (!r) return undefined;
  switch (r) {
    case "common":
    case "low": return "Convencional";
    case "uncommon":
    case "medium": return "Bonito";
    case "rare":
    case "high": return "Hermoso";
    case "very_rare": return "Impresionante";
    case "extremely_rare": return "Único";
    default: return undefined;
  }
};

/**
 * Converts a DB plant row into the frontend Plant interface
 */
function dbToPlant(row: Record<string, unknown>): Plant {
  const allImages = (row.images as string[] | null) || [];

  return {
    id: row.slug as string,
    name: row.name as string,
    variety: (row.variety as string) || "",
    quantity: (row.stock_qty as number) ?? 0,
    commonName: (row.common_name as string) || (row.name as string),
    description: (row.short_description as string) || (row.description as string) || "",
    link: (row.reference_url as string) || "",
    location: (row.origin_country as string) || "",
    light: mapLight(row.exposure as string[] | null),
    growthRate: mapGrowthRate(row.growth_rate as string | null),
    notes: (row.notes as string) || "",
    price: row.sale_price ? (row.sale_price as number) : (row.price as number) ?? 0,
    images: allImages,
    hardinessZones: (row.hardiness_zones as string[] | null) || [],
    climateZones: (row.climate_zones as string[] | null) || [],
    ornamentalValue: mapOrnamental(row.rarity as string | null),
    waterNeeds: mapWater(row.water as string | null),
    plantGroup: mapPlantGroup(row.plant_type as string | null),
    containerSize: (row.container_size as string) || undefined,
    germinationDate: (row.germination_date as string) || undefined,
    weightGrams: (row.weight_grams as number) || undefined,
  };
}

export function useCatalogPlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlants() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("plants")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((row) => dbToPlant(row as Record<string, unknown>));
      setPlants(mapped);
      setLoading(false);
    }

    fetchPlants();
    return () => { cancelled = true; };
  }, []);

  return { plants, loading, error };
}
