import { describe, it, expect } from "vitest";
import es from "@/i18n/locales/es.json";
import en from "@/i18n/locales/en.json";

/**
 * Flatten nested JSON to dot-notation keys.
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

const esKeys = new Set(flattenKeys(es));
const enKeys = new Set(flattenKeys(en));

// Keys that MUST exist in both locales (catalog/listing/detail/filter/pagination)
const REQUIRED_CATALOG_KEYS = [
  // Filters & search
  "filters.title",
  "filters.search",
  "filters.searchAI",
  "filters.water",
  "filters.zone",
  // Plant detail
  "plant.viewDetails",
  "plant.addToCart",
  "plant.soldOut",
  "plant.availability",
  "plant.availableQuantity",
  "plant.unit",
  "plant.units",
  // Navigation
  "navigation.backToCatalog",
  "navigation.catalog",
  // Header
  "header.title",
  "header.findPlant",
];

describe("Catalog i18n key coverage", () => {
  it("ES locale has all required catalog keys", () => {
    const missing = REQUIRED_CATALOG_KEYS.filter((k) => !esKeys.has(k));
    expect(missing, `Missing ES keys: ${missing.join(", ")}`).toEqual([]);
  });

  it("EN locale has all required catalog keys", () => {
    const missing = REQUIRED_CATALOG_KEYS.filter((k) => !enKeys.has(k));
    expect(missing, `Missing EN keys: ${missing.join(", ")}`).toEqual([]);
  });

  it("ES and EN locales have the same top-level structure", () => {
    const esTopKeys = Object.keys(es).sort();
    const enTopKeys = Object.keys(en).sort();
    expect(enTopKeys).toEqual(esTopKeys);
  });

  it("every ES key has a matching EN key", () => {
    const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
    expect(
      missingInEn.length,
      `Keys in ES but missing in EN:\n${missingInEn.slice(0, 20).join("\n")}`,
    ).toBe(0);
  });

  it("every EN key has a matching ES key", () => {
    const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));
    expect(
      missingInEs.length,
      `Keys in EN but missing in ES:\n${missingInEs.slice(0, 20).join("\n")}`,
    ).toBe(0);
  });
});
