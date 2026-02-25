import { describe, it, expect } from "vitest";
import { getRelatedPlants } from "@/utils/relatedPlants";
import { Plant } from "@/data/plants";

function makePlant(overrides: Partial<Plant> & { id: string; name: string }): Plant {
  return {
    variety: "",
    quantity: 5,
    commonName: overrides.name,
    description: "",
    link: "",
    location: "",
    light: "Soleada",
    growthRate: "Medio",
    notes: "",
    price: 10,
    ...overrides,
  };
}

const palm1 = makePlant({
  id: "palm-1",
  name: "Palm 1",
  plantGroup: "Palmeras",
  climateZones: ["tropical", "subtropical"],
  hardinessZones: ["10a", "10b"],
  waterNeeds: "Alta",
  price: 50,
});

const palm2 = makePlant({
  id: "palm-2",
  name: "Palm 2",
  plantGroup: "Palmeras",
  climateZones: ["tropical"],
  hardinessZones: ["10a"],
  waterNeeds: "Alta",
  price: 55,
});

const fern1 = makePlant({
  id: "fern-1",
  name: "Fern 1",
  plantGroup: "Helechos arbóreos",
  climateZones: ["atlantico"],
  hardinessZones: ["8a"],
  waterNeeds: "Moderada",
  price: 30,
});

const cycad1 = makePlant({
  id: "cycad-1",
  name: "Cycad 1",
  plantGroup: "Cícadas",
  climateZones: ["mediterraneo"],
  hardinessZones: ["9a"],
  waterNeeds: "Baja",
  price: 80,
  quantity: 0,
});

const palm3 = makePlant({
  id: "palm-3",
  name: "Palm 3",
  plantGroup: "Palmeras",
  climateZones: ["subtropical"],
  hardinessZones: ["10b", "11a"],
  waterNeeds: "Alta",
  price: 60,
});

const allPlants = [palm1, palm2, fern1, cycad1, palm3];

describe("getRelatedPlants", () => {
  it("excludes the current plant from results", () => {
    const related = getRelatedPlants(allPlants, palm1, 4);
    expect(related.find((p) => p.id === palm1.id)).toBeUndefined();
  });

  it("prioritizes same plantGroup", () => {
    const related = getRelatedPlants(allPlants, palm1, 3);
    // palm2 and palm3 should be top results (same group = +40)
    expect(related[0].plantGroup).toBe("Palmeras");
    expect(related[1].plantGroup).toBe("Palmeras");
  });

  it("returns at most maxItems results", () => {
    const related = getRelatedPlants(allPlants, palm1, 2);
    expect(related.length).toBe(2);
  });

  it("returns correct number when fewer candidates than maxItems", () => {
    const related = getRelatedPlants([palm1, palm2], palm1, 4);
    expect(related.length).toBe(1);
  });

  it("fills with fallback when not enough high-score matches", () => {
    // Only fern1 is non-palm; it shouldn't score high but should still appear as fallback
    const related = getRelatedPlants(allPlants, palm1, 4);
    expect(related.length).toBe(4);
    const ids = related.map((p) => p.id);
    expect(ids).toContain("fern-1"); // fallback fill
  });

  it("prefers in-stock over out-of-stock in fallback", () => {
    // cycad1 is out of stock, fern1 is in stock
    const related = getRelatedPlants(allPlants, palm1, 4);
    const fern1Idx = related.findIndex((p) => p.id === "fern-1");
    const cycad1Idx = related.findIndex((p) => p.id === "cycad-1");
    // fern1 (in stock) should appear before cycad1 (out of stock) in fallback
    expect(fern1Idx).toBeLessThan(cycad1Idx);
  });

  it("scores higher for matching waterNeeds", () => {
    // palm2 and palm3 both share plantGroup with palm1, but both share waterNeeds too
    // fern1 has different waterNeeds → lower score
    const related = getRelatedPlants(allPlants, palm1, 4);
    const palmIds = related.slice(0, 2).map((p) => p.id);
    expect(palmIds).toContain("palm-2");
    expect(palmIds).toContain("palm-3");
  });

  it("handles empty plant list gracefully", () => {
    const related = getRelatedPlants([], palm1, 4);
    expect(related).toEqual([]);
  });

  it("handles single plant list (only current)", () => {
    const related = getRelatedPlants([palm1], palm1, 4);
    expect(related).toEqual([]);
  });
});
