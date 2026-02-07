import { describe, it, expect } from "vitest";
import {
  calculateShipping,
  getAmountForFreeShipping,
  getZoneByCountry,
  SHIPPING_ZONES,
  ALLOWED_COUNTRIES,
} from "@/utils/shippingCalculator";

describe("shippingCalculator", () => {
  describe("SHIPPING_ZONES config", () => {
    it("every zone has valid delivery windows (min ≤ max)", () => {
      for (const z of SHIPPING_ZONES) {
        expect(z.deliveryDaysMin).toBeLessThanOrEqual(z.deliveryDaysMax);
      }
    });

    it("every zone has positive base and per-kg costs", () => {
      for (const z of SHIPPING_ZONES) {
        expect(z.baseCostCents).toBeGreaterThan(0);
        expect(z.costPerKgCents).toBeGreaterThan(0);
      }
    });

    it("ALLOWED_COUNTRIES is the union of all zone countries", () => {
      const all = SHIPPING_ZONES.flatMap((z) => z.countries);
      expect(new Set(ALLOWED_COUNTRIES)).toEqual(new Set(all));
    });
  });

  describe("getZoneByCountry", () => {
    it("returns zone for known country", () => {
      const zone = getZoneByCountry("ES");
      expect(zone).not.toBeNull();
      expect(zone!.id).toBe("spain");
    });

    it("returns null for unsupported country", () => {
      expect(getZoneByCountry("US")).toBeNull();
      expect(getZoneByCountry("")).toBeNull();
    });
  });

  describe("calculateShipping", () => {
    it("returns null for unsupported country", () => {
      expect(calculateShipping("US", 10000, 2000)).toBeNull();
    });

    it("applies free shipping when subtotal ≥ threshold (ES)", () => {
      const result = calculateShipping("ES", 15000, 3000);
      expect(result).not.toBeNull();
      expect(result!.isFreeShipping).toBe(true);
      expect(result!.shippingCostCents).toBe(0);
    });

    it("charges correctly when below free shipping threshold (ES)", () => {
      // 2kg (2000g) → ceil(2000/1000) = 2kg → 800 + 2*150 = 1100
      const result = calculateShipping("ES", 5000, 2000);
      expect(result).not.toBeNull();
      expect(result!.isFreeShipping).toBe(false);
      expect(result!.shippingCostCents).toBe(1100);
    });

    it("rounds weight up to nearest kg", () => {
      // 2100g → ceil = 3kg → 800 + 3*150 = 1250
      const result = calculateShipping("ES", 5000, 2100);
      expect(result!.shippingCostCents).toBe(1250);
    });

    it("handles zero-weight correctly (1kg minimum from ceil)", () => {
      // 0g → ceil(0/1000) = 0kg → 800 + 0*150 = 800
      const result = calculateShipping("ES", 5000, 0);
      expect(result!.shippingCostCents).toBe(800);
    });

    it("zones without free shipping never get free shipping", () => {
      // Nordic has no threshold
      const result = calculateShipping("SE", 999999, 1000);
      expect(result).not.toBeNull();
      expect(result!.isFreeShipping).toBe(false);
      expect(result!.shippingCostCents).toBeGreaterThan(0);
    });

    it("returns correct zone metadata", () => {
      const result = calculateShipping("PT", 5000, 1000);
      expect(result!.zone.id).toBe("portugal");
      expect(result!.deliveryDaysMin).toBe(3);
      expect(result!.deliveryDaysMax).toBe(5);
    });
  });

  describe("getAmountForFreeShipping", () => {
    it("returns remaining amount when below threshold", () => {
      // ES threshold = 15000, subtotal = 10000 → remaining 5000
      expect(getAmountForFreeShipping("ES", 10000)).toBe(5000);
    });

    it("returns 0 when at or above threshold", () => {
      expect(getAmountForFreeShipping("ES", 15000)).toBe(0);
      expect(getAmountForFreeShipping("ES", 20000)).toBe(0);
    });

    it("returns null for zones without free shipping", () => {
      expect(getAmountForFreeShipping("SE", 10000)).toBeNull();
    });

    it("returns null for unsupported country", () => {
      expect(getAmountForFreeShipping("US", 10000)).toBeNull();
    });
  });
});
