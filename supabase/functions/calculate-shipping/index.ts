import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// EU VAT rates by country (standard rates as of 2025)
const VAT_RATES: Record<string, number> = {
  ES: 21,   // Spain
  PT: 23,   // Portugal
  FR: 20,   // France
  DE: 19,   // Germany
  BE: 21,   // Belgium
  NL: 21,   // Netherlands
  LU: 17,   // Luxembourg
  AT: 20,   // Austria
  IT: 22,   // Italy
  SE: 25,   // Sweden
  DK: 25,   // Denmark
  FI: 25.5, // Finland
  PL: 23,   // Poland
  CZ: 21,   // Czech Republic
  SK: 23,   // Slovakia
  HU: 27,   // Hungary
  RO: 19,   // Romania
  BG: 20,   // Bulgaria
  HR: 25,   // Croatia
  SI: 22,   // Slovenia
  EE: 22,   // Estonia
  LV: 21,   // Latvia
  LT: 21,   // Lithuania
  IE: 23,   // Ireland
  MT: 18,   // Malta
  CY: 19,   // Cyprus
  GR: 24,   // Greece
};

interface CalculateShippingRequest {
  items: Array<{ plantId: string; quantity: number }>;
  countryCode: string;
}

Deno.serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get shipping zone from database
    const { data: zone, error: zoneError } = await supabase
      .from("shipping_zones")
      .select("*")
      .eq("country_code", countryCode)
      .eq("is_active", true)
      .single();

    if (zoneError || !zone) {
      return new Response(
        JSON.stringify({
          error: "SHIPPING_NOT_AVAILABLE",
          message: "No shipping available to this country",
          supported: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get product data from database
    const plantIds = items.map((i) => i.plantId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = plantIds.filter(id => uuidRegex.test(id));
    const slugs = plantIds.filter(id => !uuidRegex.test(id));
    
    const orClauses: string[] = [];
    if (slugs.length > 0) orClauses.push(`slug.in.(${slugs.map(s => `"${s}"`).join(",")})`);
    if (uuids.length > 0) orClauses.push(`id.in.(${uuids.map(u => `"${u}"`).join(",")})`);
    
    const { data: plants, error: plantsError } = await supabase
      .from("plants")
      .select("id, slug, price, sale_price, weight_grams, name")
      .or(orClauses.join(","))
      .eq("is_active", true);

    if (plantsError) {
      console.error("Error fetching plants:", plantsError);
      return new Response(
        JSON.stringify({ error: "Error fetching product data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Build lookup by slug and id
    const plantLookup = new Map<string, typeof plants[0]>();
    for (const p of plants || []) {
      plantLookup.set(p.slug, p);
      plantLookup.set(p.id, p);
    }

    // Calculate totals
    let subtotalCents = 0;
    let totalWeightGrams = 0;

    for (const item of items) {
      const plant = plantLookup.get(item.plantId);
      if (!plant) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.plantId}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      const priceCents = Math.round((plant.sale_price ?? plant.price) * 100);
      const weight = plant.weight_grams ?? 2000;
      subtotalCents += priceCents * item.quantity;
      totalWeightGrams += weight * item.quantity;
    }

    // Calculate shipping cost using zone config
    const baseCostCents = Math.round(zone.base_cost * 100);
    const perItemCostCents = Math.round(zone.per_item_cost * 100);
    const freeShippingThresholdCents = zone.free_shipping_threshold
      ? Math.round(zone.free_shipping_threshold * 100)
      : null;

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const qualifiesForFreeShipping =
      freeShippingThresholdCents !== null &&
      subtotalCents >= freeShippingThresholdCents;

    let shippingCostCents = 0;
    if (!qualifiesForFreeShipping) {
      shippingCostCents = baseCostCents + (totalItems - 1) * perItemCostCents;
    }

    // Amount needed for free shipping
    let amountForFreeShippingCents: number | null = null;
    if (freeShippingThresholdCents !== null && !qualifiesForFreeShipping) {
      amountForFreeShippingCents = freeShippingThresholdCents - subtotalCents;
    }

    // Tax calculation — prices are VAT-inclusive (IVA incluido)
    // The displayed subtotal already includes VAT, so we extract the tax component
    const vatRate = VAT_RATES[countryCode] ?? 21; // default to 21% if unknown
    const taxableAmountCents = subtotalCents + shippingCostCents;
    // base = total_incl / (1 + rate/100)
    const baseImponibleCents = Math.round(taxableAmountCents / (1 + vatRate / 100));
    const taxAmountCents = taxableAmountCents - baseImponibleCents;

    const totalCents = subtotalCents + shippingCostCents;

    return new Response(
      JSON.stringify({
        supported: true,
        // Amounts
        subtotalCents,
        shippingCostCents,
        totalCents,
        totalWeightGrams,
        // Shipping tier details
        isFreeShipping: qualifiesForFreeShipping,
        amountForFreeShippingCents,
        freeShippingThresholdCents,
        shippingBaseCostCents: baseCostCents,
        shippingPerItemCostCents: perItemCostCents,
        shippingItemCount: totalItems,
        deliveryDaysMin: zone.delivery_days_min,
        deliveryDaysMax: zone.delivery_days_max,
        zoneName: zone.country_name,
        // Tax breakdown
        vatRate,
        baseImponibleCents,
        taxAmountCents,
        countryCode,
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
