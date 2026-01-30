// Shipping zones configuration
export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  baseCostCents: number;
  costPerKgCents: number;
  freeShippingThresholdCents: number | null;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "spain",
    name: "España peninsular",
    countries: ["ES"],
    baseCostCents: 800, // 8€ base
    costPerKgCents: 150, // 1.50€ per kg
    freeShippingThresholdCents: 15000, // Free shipping over 150€
    deliveryDaysMin: 2,
    deliveryDaysMax: 4,
  },
  {
    id: "portugal",
    name: "Portugal",
    countries: ["PT"],
    baseCostCents: 1200, // 12€ base
    costPerKgCents: 200, // 2€ per kg
    freeShippingThresholdCents: 20000, // Free shipping over 200€
    deliveryDaysMin: 3,
    deliveryDaysMax: 5,
  },
  {
    id: "france",
    name: "Francia",
    countries: ["FR"],
    baseCostCents: 1500, // 15€ base
    costPerKgCents: 250, // 2.50€ per kg
    freeShippingThresholdCents: 25000, // Free shipping over 250€
    deliveryDaysMin: 4,
    deliveryDaysMax: 6,
  },
  {
    id: "central_europe",
    name: "Europa Central",
    countries: ["DE", "BE", "NL", "LU", "AT"],
    baseCostCents: 1800, // 18€ base
    costPerKgCents: 300, // 3€ per kg
    freeShippingThresholdCents: 30000, // Free shipping over 300€
    deliveryDaysMin: 5,
    deliveryDaysMax: 8,
  },
  {
    id: "italy",
    name: "Italia",
    countries: ["IT"],
    baseCostCents: 1600, // 16€ base
    costPerKgCents: 280, // 2.80€ per kg
    freeShippingThresholdCents: 28000, // Free shipping over 280€
    deliveryDaysMin: 4,
    deliveryDaysMax: 7,
  },
  {
    id: "nordic",
    name: "Países Nórdicos",
    countries: ["SE", "DK", "FI"],
    baseCostCents: 2500, // 25€ base
    costPerKgCents: 400, // 4€ per kg
    freeShippingThresholdCents: null, // No free shipping
    deliveryDaysMin: 6,
    deliveryDaysMax: 10,
  },
  {
    id: "eastern_europe",
    name: "Europa del Este",
    countries: ["PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI"],
    baseCostCents: 2200, // 22€ base
    costPerKgCents: 350, // 3.50€ per kg
    freeShippingThresholdCents: null, // No free shipping
    deliveryDaysMin: 6,
    deliveryDaysMax: 10,
  },
  {
    id: "baltic",
    name: "Países Bálticos",
    countries: ["EE", "LV", "LT"],
    baseCostCents: 2800, // 28€ base
    costPerKgCents: 450, // 4.50€ per kg
    freeShippingThresholdCents: null, // No free shipping
    deliveryDaysMin: 7,
    deliveryDaysMax: 12,
  },
  {
    id: "islands",
    name: "Islas",
    countries: ["IE", "MT", "CY", "GR"],
    baseCostCents: 3000, // 30€ base
    costPerKgCents: 500, // 5€ per kg
    freeShippingThresholdCents: null, // No free shipping
    deliveryDaysMin: 8,
    deliveryDaysMax: 14,
  },
];

// All allowed shipping countries
export const ALLOWED_COUNTRIES = SHIPPING_ZONES.flatMap((zone) => zone.countries);

// Country names for display
export const COUNTRY_NAMES: Record<string, string> = {
  ES: "España",
  PT: "Portugal",
  FR: "Francia",
  DE: "Alemania",
  BE: "Bélgica",
  NL: "Países Bajos",
  LU: "Luxemburgo",
  AT: "Austria",
  IT: "Italia",
  SE: "Suecia",
  DK: "Dinamarca",
  FI: "Finlandia",
  PL: "Polonia",
  CZ: "República Checa",
  SK: "Eslovaquia",
  HU: "Hungría",
  RO: "Rumanía",
  BG: "Bulgaria",
  HR: "Croacia",
  SI: "Eslovenia",
  EE: "Estonia",
  LV: "Letonia",
  LT: "Lituania",
  IE: "Irlanda",
  MT: "Malta",
  CY: "Chipre",
  GR: "Grecia",
};

export interface ShippingCalculationResult {
  zone: ShippingZone;
  shippingCostCents: number;
  isFreeShipping: boolean;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

/**
 * Calculate shipping cost based on country, subtotal, and total weight
 */
export function calculateShipping(
  countryCode: string,
  subtotalCents: number,
  totalWeightGrams: number
): ShippingCalculationResult | null {
  // Find the shipping zone for the country
  const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));

  if (!zone) {
    return null; // Country not supported
  }

  // Check if free shipping applies
  const qualifiesForFreeShipping =
    zone.freeShippingThresholdCents !== null &&
    subtotalCents >= zone.freeShippingThresholdCents;

  if (qualifiesForFreeShipping) {
    return {
      zone,
      shippingCostCents: 0,
      isFreeShipping: true,
      deliveryDaysMin: zone.deliveryDaysMin,
      deliveryDaysMax: zone.deliveryDaysMax,
    };
  }

  // Calculate weight-based cost
  const weightKg = Math.ceil(totalWeightGrams / 1000); // Round up to nearest kg
  const weightCost = weightKg * zone.costPerKgCents;
  const totalShippingCents = zone.baseCostCents + weightCost;

  return {
    zone,
    shippingCostCents: totalShippingCents,
    isFreeShipping: false,
    deliveryDaysMin: zone.deliveryDaysMin,
    deliveryDaysMax: zone.deliveryDaysMax,
  };
}

/**
 * Get the amount needed for free shipping in a specific country
 */
export function getAmountForFreeShipping(
  countryCode: string,
  currentSubtotalCents: number
): number | null {
  const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));

  if (!zone || zone.freeShippingThresholdCents === null) {
    return null; // No free shipping available
  }

  const remaining = zone.freeShippingThresholdCents - currentSubtotalCents;
  return remaining > 0 ? remaining : 0;
}

/**
 * Get zone by country code
 */
export function getZoneByCountry(countryCode: string): ShippingZone | null {
  return SHIPPING_ZONES.find((z) => z.countries.includes(countryCode)) || null;
}
