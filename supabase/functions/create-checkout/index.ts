import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product catalog with prices and weights (in cents and grams)
// This should match frontend data
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

// Shipping zones configuration
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

interface CartItem {
  plantId: string;
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
  containerSize?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  shippingCountry: string;
  shippingAddress?: {
    email: string;
    fullName: string;
    phone?: string;
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
    notes?: string;
  };
  locale?: string;
}

function calculateShipping(
  countryCode: string,
  subtotalCents: number,
  totalWeightGrams: number
): { shippingCostCents: number; zone: ShippingZone; isFreeShipping: boolean } | null {
  const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));
  if (!zone) return null;

  const qualifiesForFreeShipping =
    zone.freeShippingThresholdCents !== null &&
    subtotalCents >= zone.freeShippingThresholdCents;

  if (qualifiesForFreeShipping) {
    return { shippingCostCents: 0, zone, isFreeShipping: true };
  }

  const weightKg = Math.ceil(totalWeightGrams / 1000);
  const weightCost = weightKg * zone.costPerKgCents;
  const totalShippingCents = zone.baseCostCents + weightCost;

  return { shippingCostCents: totalShippingCents, zone, isFreeShipping: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { items, shippingCountry, shippingAddress, locale = "es" }: CheckoutRequest = await req.json();

    console.log("Checkout request:", { items, shippingCountry, locale });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    if (!shippingCountry) {
      throw new Error("Shipping country is required");
    }

    // Validate country is supported
    if (!ALLOWED_COUNTRIES.includes(shippingCountry)) {
      return new Response(
        JSON.stringify({ 
          error: "SHIPPING_NOT_AVAILABLE",
          message: "No shipping available to this country" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Recalculate subtotal and weight from backend catalog (security)
    let subtotalCents = 0;
    let totalWeightGrams = 0;
    const validatedItems: Array<{
      plantId: string;
      quantity: number;
      priceCents: number;
      weightGrams: number;
      name: string;
      image?: string;
      containerSize?: string;
    }> = [];

    for (const item of items) {
      const catalogItem = PRODUCT_CATALOG[item.plantId];
      if (!catalogItem) {
        console.error(`Product not found: ${item.plantId}`);
        throw new Error(`Product not found: ${item.plantId}`);
      }

      subtotalCents += catalogItem.priceCents * item.quantity;
      totalWeightGrams += catalogItem.weightGrams * item.quantity;
      validatedItems.push({
        plantId: item.plantId,
        quantity: item.quantity,
        priceCents: catalogItem.priceCents,
        weightGrams: catalogItem.weightGrams,
        name: catalogItem.name,
        image: item.image,
        containerSize: item.containerSize,
      });
    }

    console.log("Calculated:", { subtotalCents, totalWeightGrams });

    // Calculate shipping
    const shippingResult = calculateShipping(shippingCountry, subtotalCents, totalWeightGrams);
    if (!shippingResult) {
      return new Response(
        JSON.stringify({ 
          error: "SHIPPING_NOT_AVAILABLE",
          message: "No shipping available to this country" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Shipping:", shippingResult);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user is authenticated
    let userId: string | null = null;
    let customerEmail = shippingAddress?.email || "";

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        customerEmail = data.user.email || customerEmail;
      }
    }

    // Check if Stripe customer exists
    let customerId: string | undefined;
    if (customerEmail) {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Get origin for URLs
    const origin = req.headers.get("origin") || "https://wedding-gift-botanicals.lovable.app";

    // Helper for absolute image URLs
    const getAbsoluteImageUrl = (imageUrl: string | undefined): string[] | undefined => {
      if (!imageUrl) return undefined;
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return [imageUrl];
      }
      const baseUrl = origin.replace(/\/$/, "");
      const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
      return [`${baseUrl}${imagePath}`];
    };

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validatedItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          description: item.containerSize || undefined,
          images: getAbsoluteImageUrl(item.image),
        },
        unit_amount: item.priceCents,
      },
      quantity: item.quantity,
    }));

    // Build shipping options
    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          display_name: shippingResult.isFreeShipping
            ? "Envío gratuito"
            : "Envío estándar",
          type: "fixed_amount",
          fixed_amount: {
            amount: shippingResult.shippingCostCents,
            currency: "eur",
          },
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: shippingResult.zone.deliveryDaysMin,
            },
            maximum: {
              unit: "business_day",
              value: shippingResult.zone.deliveryDaysMax,
            },
          },
        },
      },
    ];

    // Create Stripe Checkout session with embedded mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail || undefined,
      line_items: lineItems,
      mode: "payment",
      ui_mode: "embedded",
      payment_method_types: [
        "card",
        "sepa_debit",
        "ideal",
        "bancontact",
        "giropay",
        "sofort",
      ],
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ALLOWED_COUNTRIES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: shippingOptions,
      locale: locale === "es" ? "es" : "en",
      metadata: {
        user_id: userId || "guest",
        subtotal_cents: subtotalCents.toString(),
        shipping_cents: shippingResult.shippingCostCents.toString(),
        total_weight_grams: totalWeightGrams.toString(),
        shipping_zone: shippingResult.zone.id,
        shipping_country: shippingCountry,
        is_free_shipping: shippingResult.isFreeShipping.toString(),
        items_json: JSON.stringify(validatedItems.map(i => ({
          id: i.plantId,
          qty: i.quantity,
          price: i.priceCents,
          name: i.name,
        }))),
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        clientSecret: session.client_secret,
        sessionId: session.id,
        publishableKey: Deno.env.get("VITE_STRIPE_PUBLISHABLE_KEY") || "",
        shippingCostCents: shippingResult.shippingCostCents,
        subtotalCents,
        totalCents: subtotalCents + shippingResult.shippingCostCents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
