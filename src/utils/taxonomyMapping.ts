/**
 * Canonical mapping between DB plant_type enum and category slugs.
 * Used by admin CSV import, PlantFormDialog, and catalog filters.
 *
 * Keep in sync with scripts/seed-categories.sql
 */

export const PLANT_TYPE_TO_CATEGORY_SLUG: Record<string, string> = {
  palm: "palmeras",
  cycad: "cicadas",
  tree: "arboles-ornamentales",
  shrub: "arbustos-ornamentales",
  fern: "helechos-arboreos",
  succulent: "suculentas",
  grass: "hierbas",
  bamboo: "bambus",
  bromeliad: "bromeliaceas",
  heliconia: "heliconias",
  strelitzia: "estrelicias",
  ginger: "jengibres",
  banana: "platanos",
  agave: "agaves-yucas",
  aroid: "araceas",
  cactus: "cactus",
  conifer: "coniferas",
  perennial: "perennes",
};

export const CATEGORY_SLUG_TO_PLANT_GROUP: Record<string, string> = {
  palmeras: "Palmeras",
  cicadas: "Cícadas",
  "arboles-ornamentales": "Árboles ornamentales",
  "arbustos-ornamentales": "Arbustos ornamentales",
  "helechos-arboreos": "Helechos arbóreos",
  bambus: "Bambús",
  suculentas: "Suculentas",
  cactus: "Cactus",
  coniferas: "Coníferas",
  bromeliaceas: "Bromeliáceas",
  heliconias: "Heliconias",
  estrelicias: "Estrelicias",
  jengibres: "Jengibres",
  platanos: "Plátanos",
  "agaves-yucas": "Agaves y yucas",
  araceas: "Aráceas",
  perennes: "Perennes",
  hierbas: "Hierbas",
};

/**
 * Given a plant_type enum value, returns the category slug.
 * Returns undefined for "other" or unknown types.
 */
export function getCategorySlugForPlantType(
  plantType: string | null
): string | undefined {
  if (!plantType) return undefined;
  return PLANT_TYPE_TO_CATEGORY_SLUG[plantType];
}
