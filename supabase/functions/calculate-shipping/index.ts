import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// EU VAT rates by country (standard rates as of 2025)
const VAT_RATES: Record<string, number> = {
  ES: 21, PT: 23, FR: 20, DE: 19, BE: 21, NL: 21, LU: 17, AT: 20,
  IT: 22, SE: 25, DK: 25, FI: 25.5, PL: 23, CZ: 21, SK: 23, HU: 27,
  RO: 19, BG: 20, HR: 25, SI: 22, EE: 22, LV: 21, LT: 21, IE: 23,
  MT: 18, CY: 19, GR: 24,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const rl = checkRateLimit(req, PRESETS.public_read);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const body = await req.json();

    // ── Schema validation ──
    const v = validate(schemas.calculateShipping, body, corsHeaders);
    if (v.error) return v.error;

    const { items, countryCode } = v.data;

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
    const plantIds = items.map((i: { plantId: string }) => i.plantId);
    const uuids = plantIds.filter((id: string) => UUID_RE.test(id));
    const slugs = plantIds.filter((id: string) => !UUID_RE.test(id));

    const orClauses: string[] = [];
    if (slugs.length > 0) orClauses.push(`slug.in.(${slugs.map((s: string) => `"${s}"`).join(",")})`);
    if (uuids.length > 0) orClauses.push(`id.in.(${uuids.map((u: string) => `"${u}"`).join(",")})`);

    const { data: plants, error: plantsError } = await supabase
      .from("plants")
      .select("id, slug, price, sale_price, weight_grams, name")
      .or(orClauses.join(","))
      .eq("is_active", true);

    if (plantsError) {
      console.error("Error fetching plants:", plantsError);
      return jsonError("Error fetching product data", 500);
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
        return jsonError(`Product not found: ${item.plantId}`);
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

    const totalItems = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    const qualifiesForFreeShipping =
      freeShippingThresholdCents !== null &&
      subtotalCents >= freeShippingThresholdCents;

    let shippingCostCents = 0;
    if (!qualifiesForFreeShipping) {
      shippingCostCents = baseCostCents + (totalItems - 1) * perItemCostCents;
    }

    let amountForFreeShippingCents: number | null = null;
    if (freeShippingThresholdCents !== null && !qualifiesForFreeShipping) {
      amountForFreeShippingCents = freeShippingThresholdCents - subtotalCents;
    }

    // Tax calculation — prices are VAT-inclusive (IVA incluido)
    const vatRate = VAT_RATES[countryCode] ?? 21;
    const taxableAmountCents = subtotalCents + shippingCostCents;
    const baseImponibleCents = Math.round(taxableAmountCents / (1 + vatRate / 100));
    const taxAmountCents = taxableAmountCents - baseImponibleCents;

    const totalCents = subtotalCents + shippingCostCents;

    return new Response(
      JSON.stringify({
        supported: true,
        subtotalCents,
        shippingCostCents,
        totalCents,
        totalWeightGrams,
        isFreeShipping: qualifiesForFreeShipping,
        amountForFreeShippingCents,
        freeShippingThresholdCents,
        shippingBaseCostCents: baseCostCents,
        shippingPerItemCostCents: perItemCostCents,
        shippingItemCount: totalItems,
        deliveryDaysMin: zone.delivery_days_min,
        deliveryDaysMax: zone.delivery_days_max,
        zoneName: zone.country_name,
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
