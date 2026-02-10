import * as XLSX from "xlsx";

const HEADERS = [
  "slug",
  "name",
  "scientific_name",
  "common_name",
  "plant_type",
  "category_slug",
  "short_description",
  "description",
  "notes",
  "price",
  "sale_price",
  "stock_qty",
  "is_in_stock",
  "is_active",
  "is_featured",
  "display_order",
  "container_size",
  "germination_date",
  "mature_height",
  "mature_width",
  "growth_rate",
  "climate_zones",
  "hardiness_zone",
  "min_temp_c",
  "exposure",
  "sun_requirement",
  "water",
  "water_requirement",
  "humidity",
  "temperature_range",
  "difficulty",
  "rarity",
  "origin_country",
  "origin_region",
  "native_habitat",
  "plant_use",
  "images",
  "thumbnail_url",
  "meta_title",
  "meta_description",
  "care_watering",
  "care_fertilizing",
  "care_pruning",
  "care_repotting",
  "curious_facts",
  "spec_familia",
  "spec_genero",
];

const EXAMPLE_ROW: Record<string, string | number | boolean> = {
  slug: "rhopalostylis-sapida",
  name: "Rhopalostylis sapida",
  scientific_name: "Rhopalostylis sapida",
  common_name: "Palmera Nikau",
  plant_type: "palm",
  category_slug: "palmeras",
  short_description: "La única palmera nativa de Nueva Zelanda",
  description:
    "Elegante palmera con tronco distintivo anillado y corona de hojas pinnadas. Originaria de Nueva Zelanda, es resistente y adaptable.",
  notes: "Variedad Oceana muy resistente al frío",
  price: 85,
  sale_price: "",
  stock_qty: 4,
  is_in_stock: "true",
  is_active: "true",
  is_featured: "false",
  display_order: 0,
  container_size: "3 litros",
  germination_date: "Marzo 2023",
  mature_height: "10-15m",
  mature_width: "2-3m",
  growth_rate: "Medio",
  climate_zones: "9a|9b|10a|10b|11a|11b",
  hardiness_zone: "9a-11b",
  min_temp_c: -5,
  exposure: "partial_shade",
  sun_requirement: "Semisol",
  water: "medium",
  water_requirement: "Moderada",
  humidity: "medium",
  temperature_range: "5°C - 35°C",
  difficulty: "intermediate",
  rarity: "rare",
  origin_country: "Nueva Zelanda",
  origin_region: "Isla Norte",
  native_habitat: "Bosques subtropicales húmedos",
  plant_use: "outdoor|container|landscape",
  images: "/lovable-uploads/img1.png|/lovable-uploads/img2.png",
  thumbnail_url: "/lovable-uploads/img1.png",
  meta_title: "Rhopalostylis sapida | Palmera Nikau | Frondaprima",
  meta_description:
    "Compra Rhopalostylis sapida la única palmera nativa de Nueva Zelanda. Envío a toda España.",
  care_watering: "Riego moderado mantener sustrato húmedo",
  care_fertilizing: "Fertilizar cada 2 meses en primavera-verano",
  care_pruning: "Eliminar hojas secas",
  care_repotting: "Cada 2-3 años",
  curious_facts:
    "Es la palmera más austral del mundo|Puede vivir más de 200 años",
  spec_familia: "Arecaceae",
  spec_genero: "Rhopalostylis",
};

// Helper hints for the "Instrucciones" sheet
const INSTRUCTIONS: string[][] = [
  ["Campo", "Tipo", "Valores permitidos", "Notas"],
  ["slug", "texto", "minúsculas-con-guiones", "Identificador único"],
  ["plant_type", "enum", "palm|fern|cycad|tree|shrub|bamboo|succulent|cactus|bromeliad|other", ""],
  ["growth_rate", "enum", "Lento|Medio|Rápido", ""],
  ["climate_zones", "texto", "Separar con |", "Ej: 9a|9b|10a"],
  ["exposure", "enum", "full_sun|partial_shade|full_shade", "Separar con |"],
  ["water", "enum", "low|medium|high", ""],
  ["humidity", "enum", "low|medium|high", ""],
  ["difficulty", "enum", "easy|intermediate|advanced", ""],
  ["rarity", "enum", "common|medium|rare|very_rare", ""],
  ["plant_use", "texto", "indoor|outdoor|container|landscape", "Separar con |"],
  ["images", "texto", "URLs separadas con |", ""],
  ["curious_facts", "texto", "Separar con |", ""],
  ["is_in_stock / is_active / is_featured", "bool", "true|false", ""],
];

export function downloadPlantXlsxTemplate(): void {
  const wb = XLSX.utils.book_new();

  // --- Productos sheet ---
  const data = [HEADERS, HEADERS.map((h) => EXAMPLE_ROW[h] ?? "")];
  // Add 19 empty rows for user input
  for (let i = 0; i < 19; i++) {
    data.push(HEADERS.map(() => ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws["!cols"] = HEADERS.map((h) => ({
    wch: Math.max(h.length + 2, 18),
  }));

  XLSX.utils.book_append_sheet(wb, ws, "Productos");

  // --- Instrucciones sheet ---
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInstr["!cols"] = [{ wch: 35 }, { wch: 10 }, { wch: 55 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

  XLSX.writeFile(wb, "plantilla_productos_frondaprima.xlsx");
}
