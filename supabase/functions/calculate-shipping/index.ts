import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { data: plants, error: plantsError } = await supabase
      .from("plants")
      .select("id, slug, price, sale_price, weight_grams, name")
      .or(`slug.in.(${plantIds.map(id => `"${id}"`).join(",")}),id.in.(${plantIds.map(id => `"${id}"`).join(",")})`)
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
      const weight = plant.weight_grams ?? 2000; // default 2kg if not set
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

    return new Response(
      JSON.stringify({
        supported: true,
        subtotalCents,
        shippingCostCents,
        totalCents: subtotalCents + shippingCostCents,
        totalWeightGrams,
        isFreeShipping: qualifiesForFreeShipping,
        amountForFreeShippingCents,
        freeShippingThresholdCents,
        deliveryDaysMin: zone.delivery_days_min,
        deliveryDaysMax: zone.delivery_days_max,
        zoneName: zone.country_name,
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
