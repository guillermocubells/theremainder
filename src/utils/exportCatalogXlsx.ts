import ExcelJS from "exceljs";

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

function formatCell(value: unknown): string | number | boolean {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("|");
  if (typeof value === "boolean") return value ? "true" : "false";
  return value as string | number;
}

export async function exportCatalogXlsx(
  plants: Record<string, unknown>[],
  categoryMap: Record<string, string>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Catálogo");

  // Header row
  ws.addRow(HEADERS);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };

  // Data rows
  for (const plant of plants) {
    const catId = plant.category_id as string | null;
    const row = HEADERS.map((h) => {
      if (h === "category_slug") return catId ? (categoryMap[catId] || "") : "";
      if (h === "is_in_stock") return (plant.stock_qty as number) > 0 ? "true" : "false";
      if (h === "hardiness_zone") {
        const zones = plant.hardiness_zones as string[] | null;
        return zones?.join(", ") || "";
      }
      if (h === "climate_zones") {
        const cz = plant.climate_zones as string[] | null;
        return cz?.join("|") || "";
      }
      if (h === "exposure") {
        const exp = plant.exposure as string[] | null;
        return exp?.join("|") || "";
      }
      if (h === "images") {
        const imgs = plant.images as string[] | null;
        return imgs?.join("|") || "";
      }
      if (h === "curious_facts") {
        const cf = plant.curious_facts as string[] | null;
        return cf?.join("|") || "";
      }
      if (h === "plant_use") {
        const pu = plant.plant_use as string[] | null;
        return pu?.join("|") || "";
      }
      return formatCell(plant[h]);
    });
    ws.addRow(row);
  }

  // Auto-width columns
  ws.columns = HEADERS.map((h) => ({
    width: Math.max(h.length + 2, 16),
  }));

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `catalogo_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
