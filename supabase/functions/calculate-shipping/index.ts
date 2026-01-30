import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product catalog (same as create-checkout)
const PRODUCT_CATALOG: Record<string, { priceCents: number; weightGrams: number; name: string }> = {
  "rhopalostylis-sapida": { priceCents: 8500, weightGrams: 2500, name: "Rhopalostylis sapida" },
  "chuniophoenix-hainanensis": { priceCents: 12000, weightGrams: 4000, name: "Chuniophoenix hainanensis" },
  "brahea-armata": { priceCents: 15000, weightGrams: 5500, name: "Brahea armata" },
  "sabal-miamensis": { priceCents: 9500, weightGrams: 4000, name: "Sabal miamensis" },
  "ptychosperma-caryotoides": { priceCents: 7500, weightGrams: 2500, name: "Ptychosperma caryotoides" },
  "caryota-obtusa": { priceCents: 11000, weightGrams: 4000, name: "Caryota obtusa" },
  "cyathea-sp": { priceCents: 6500, weightGrams: 2000, name: "Cyathea sp." },
  "dicksonia-sp": { priceCents: 7000, weightGrams: 4500, name: "Dicksonia sp." },
  "zamia-integrifolia": { priceCents: 13000, weightGrams: 3000, name: "Zamia integrifolia" },
  "magnolia-laevifolia": { priceCents: 9000, weightGrams: 4500, name: "Magnolia laevifolia" },
  "chamaedorea-elegans": { priceCents: 5500, weightGrams: 1500, name: "Chamaedorea elegans" },
  "basselinia-favieri": { priceCents: 14000, weightGrams: 2500, name: "Basselinia favieri" },
};

// Shipping zones
interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  baseCostCents: number;
  costPerKgCents: number;
  freeShippingThresholdCents: number | null;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "spain",
    name: "España peninsular",
    countries: ["ES"],
    baseCostCents: 800,
    costPerKgCents: 150,
    freeShippingThresholdCents: 15000,
    deliveryDaysMin: 2,
    deliveryDaysMax: 4,
  },
  {
    id: "portugal",
    name: "Portugal",
    countries: ["PT"],
    baseCostCents: 1200,
    costPerKgCents: 200,
    freeShippingThresholdCents: 20000,
    deliveryDaysMin: 3,
    deliveryDaysMax: 5,
  },
  {
    id: "france",
    name: "Francia",
    countries: ["FR"],
    baseCostCents: 1500,
    costPerKgCents: 250,
    freeShippingThresholdCents: 25000,
    deliveryDaysMin: 4,
    deliveryDaysMax: 6,
  },
  {
    id: "central_europe",
    name: "Europa Central",
    countries: ["DE", "BE", "NL", "LU", "AT"],
    baseCostCents: 1800,
    costPerKgCents: 300,
    freeShippingThresholdCents: 30000,
    deliveryDaysMin: 5,
    deliveryDaysMax: 8,
  },
  {
    id: "italy",
    name: "Italia",
    countries: ["IT"],
    baseCostCents: 1600,
    costPerKgCents: 280,
    freeShippingThresholdCents: 28000,
    deliveryDaysMin: 4,
    deliveryDaysMax: 7,
  },
  {
    id: "nordic",
    name: "Países Nórdicos",
    countries: ["SE", "DK", "FI"],
    baseCostCents: 2500,
    costPerKgCents: 400,
    freeShippingThresholdCents: null,
    deliveryDaysMin: 6,
    deliveryDaysMax: 10,
  },
  {
    id: "eastern_europe",
    name: "Europa del Este",
    countries: ["PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI"],
    baseCostCents: 2200,
    costPerKgCents: 350,
    freeShippingThresholdCents: null,
    deliveryDaysMin: 6,
    deliveryDaysMax: 10,
  },
  {
    id: "baltic",
    name: "Países Bálticos",
    countries: ["EE", "LV", "LT"],
    baseCostCents: 2800,
    costPerKgCents: 450,
    freeShippingThresholdCents: null,
    deliveryDaysMin: 7,
    deliveryDaysMax: 12,
  },
  {
    id: "islands",
    name: "Islas",
    countries: ["IE", "MT", "CY", "GR"],
    baseCostCents: 3000,
    costPerKgCents: 500,
    freeShippingThresholdCents: null,
    deliveryDaysMin: 8,
    deliveryDaysMax: 14,
  },
];

const ALLOWED_COUNTRIES = SHIPPING_ZONES.flatMap((zone) => zone.countries);

interface CalculateShippingRequest {
  items: Array<{ plantId: string; quantity: number }>;
  countryCode: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, countryCode }: CalculateShippingRequest = await req.json();

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!countryCode) {
      return new Response(
        JSON.stringify({ error: "Country code is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if country is supported
    if (!ALLOWED_COUNTRIES.includes(countryCode)) {
      return new Response(
        JSON.stringify({ 
          error: "SHIPPING_NOT_AVAILABLE",
          message: "No shipping available to this country",
          supported: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Calculate totals from backend catalog
    let subtotalCents = 0;
    let totalWeightGrams = 0;

    for (const item of items) {
      const catalogItem = PRODUCT_CATALOG[item.plantId];
      if (!catalogItem) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.plantId}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      subtotalCents += catalogItem.priceCents * item.quantity;
      totalWeightGrams += catalogItem.weightGrams * item.quantity;
    }

    // Find zone
    const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));
    if (!zone) {
      return new Response(
        JSON.stringify({ 
          error: "SHIPPING_NOT_AVAILABLE",
          supported: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Calculate shipping
    const qualifiesForFreeShipping =
      zone.freeShippingThresholdCents !== null &&
      subtotalCents >= zone.freeShippingThresholdCents;

    let shippingCostCents = 0;
    if (!qualifiesForFreeShipping) {
      const weightKg = Math.ceil(totalWeightGrams / 1000);
      shippingCostCents = zone.baseCostCents + weightKg * zone.costPerKgCents;
    }

    // Calculate amount needed for free shipping
    let amountForFreeShippingCents: number | null = null;
    if (zone.freeShippingThresholdCents !== null && !qualifiesForFreeShipping) {
      amountForFreeShippingCents = zone.freeShippingThresholdCents - subtotalCents;
    }

    return new Response(
      JSON.stringify({
        supported: true,
        subtotalCents,
        shippingCostCents,
        totalCents: subtotalCents + shippingCostCents,
        totalWeightGrams,
        isFreeShipping: qualifiesForFreeShipping,
        amountForFreeShippingCents,
        freeShippingThresholdCents: zone.freeShippingThresholdCents,
        deliveryDaysMin: zone.deliveryDaysMin,
        deliveryDaysMax: zone.deliveryDaysMax,
        zoneName: zone.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Calculate shipping error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
