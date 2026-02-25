import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  plantId: string;
  quantity: number;
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
  referralCode?: string;
  useWalletBalance?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { items, shippingCountry, shippingAddress, locale = "es", referralCode, useWalletBalance }: CheckoutRequest = await req.json();

    console.log("Checkout request:", { items: items.length, shippingCountry, locale, referralCode });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    if (!shippingCountry) {
      throw new Error("Shipping country is required");
    }

    // Get shipping zone from database
    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("shipping_zones")
      .select("*")
      .eq("country_code", shippingCountry)
      .eq("is_active", true)
      .single();

    if (zoneError || !zone) {
      return new Response(
        JSON.stringify({ error: "SHIPPING_NOT_AVAILABLE", message: "No shipping available to this country" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get all allowed countries for Stripe shipping address collection
    const { data: allZones } = await supabaseAdmin
      .from("shipping_zones")
      .select("country_code")
      .eq("is_active", true);

    const allowedCountries = (allZones || []).map(z => z.country_code);

    // Fetch product data from database
    const plantIds = items.map(i => i.plantId);
    // Separate UUIDs from slugs to avoid type errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = plantIds.filter(id => uuidRegex.test(id));
    const slugs = plantIds.filter(id => !uuidRegex.test(id));
    
    const orClauses: string[] = [];
    if (slugs.length > 0) orClauses.push(`slug.in.(${slugs.map(s => `"${s}"`).join(",")})`);
    if (uuids.length > 0) orClauses.push(`id.in.(${uuids.map(u => `"${u}"`).join(",")})`);
    
    const { data: plants, error: plantsError } = await supabaseAdmin
      .from("plants")
      .select("id, slug, price, sale_price, weight_grams, name, container_size")
      .or(orClauses.join(","))
      .eq("is_active", true);

    if (plantsError) {
      console.error("Error fetching plants:", plantsError);
      throw new Error("Error fetching product data");
    }

    // Build lookup by slug and id
    const plantLookup = new Map<string, typeof plants[0]>();
    for (const p of plants || []) {
      plantLookup.set(p.slug, p);
      plantLookup.set(p.id, p);
    }

    // Calculate totals from DB data (security: never trust client prices)
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
      const plant = plantLookup.get(item.plantId);
      if (!plant) {
        console.error(`Product not found: ${item.plantId}`);
        throw new Error(`Product not found: ${item.plantId}`);
      }

      const priceCents = Math.round((plant.sale_price ?? plant.price) * 100);
      const weightGrams = plant.weight_grams ?? 2000;

      subtotalCents += priceCents * item.quantity;
      totalWeightGrams += weightGrams * item.quantity;
      validatedItems.push({
        plantId: item.plantId,
        quantity: item.quantity,
        priceCents,
        weightGrams,
        name: plant.name,
        image: item.image,
        containerSize: item.containerSize || plant.container_size || undefined,
      });
    }

    console.log("Calculated:", { subtotalCents, totalWeightGrams });

    // Calculate shipping using zone config
    const baseCostCents = Math.round(zone.base_cost * 100);
    const perItemCostCents = Math.round(zone.per_item_cost * 100);
    const freeShippingThresholdCents = zone.free_shipping_threshold
      ? Math.round(zone.free_shipping_threshold * 100)
      : null;

    const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const qualifiesForFreeShipping =
      freeShippingThresholdCents !== null && subtotalCents >= freeShippingThresholdCents;

    let shippingCostCents = 0;
    if (!qualifiesForFreeShipping) {
      shippingCostCents = baseCostCents + (totalItemCount - 1) * perItemCostCents;
    }

    console.log("Shipping:", { shippingCostCents, qualifiesForFreeShipping, zone: zone.country_name });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user is authenticated
    let userId: string | null = null;
    let customerEmail = shippingAddress?.email || "";
    let walletAmountToUseCents = 0;
    let walletBalanceCents = 0;
    let validReferralCode: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        customerEmail = data.user.email || customerEmail;

        // Get wallet balance if user wants to use it
        if (useWalletBalance) {
          const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("available_balance")
            .eq("user_id", userId)
            .single();

          if (wallet && wallet.available_balance > 0) {
            walletBalanceCents = Math.round(wallet.available_balance * 100);
            const { data: maxWalletSetting } = await supabaseAdmin
              .from("referral_settings")
              .select("value")
              .eq("key", "MAX_WALLET_PERCENT")
              .single();

            const maxWalletPercent = maxWalletSetting?.value || 50;
            const maxWalletCents = Math.round(subtotalCents * (maxWalletPercent / 100));
            walletAmountToUseCents = Math.min(walletBalanceCents, maxWalletCents, subtotalCents);
          }
        }

        // Validate referral code
        if (referralCode) {
          const { data: refCode } = await supabaseAdmin
            .from("referral_codes")
            .select("user_id, code")
            .eq("code", referralCode.toUpperCase())
            .single();

          if (refCode && refCode.user_id !== userId) {
            validReferralCode = refCode.code;
          }
        }
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

    const origin = req.headers.get("origin") || "https://theremainder.lovable.app";

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

    // Add wallet discount as a negative line item
    if (walletAmountToUseCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Descuento saldo de cuenta",
            description: "Crédito aplicado de tu cartera",
          },
          unit_amount: -walletAmountToUseCents,
        },
        quantity: 1,
      });
    }

    // Build shipping options
    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          display_name: qualifiesForFreeShipping ? "Envío gratuito" : "Envío estándar",
          type: "fixed_amount",
          fixed_amount: {
            amount: shippingCostCents,
            currency: "eur",
          },
          delivery_estimate: {
            minimum: { unit: "business_day", value: zone.delivery_days_min },
            maximum: { unit: "business_day", value: zone.delivery_days_max },
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
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: shippingOptions,
      locale: locale === "es" ? "es" : "en",
      metadata: {
        user_id: userId || "guest",
        subtotal_cents: subtotalCents.toString(),
        shipping_cents: shippingCostCents.toString(),
        wallet_amount_cents: walletAmountToUseCents.toString(),
        referral_code_used: validReferralCode || "",
        total_weight_grams: totalWeightGrams.toString(),
        shipping_zone: zone.id,
        shipping_country: shippingCountry,
        is_free_shipping: qualifiesForFreeShipping.toString(),
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
        shippingCostCents,
        subtotalCents,
        walletAmountCents: walletAmountToUseCents,
        walletBalanceCents,
        referralCodeApplied: validReferralCode,
        totalCents: subtotalCents + shippingCostCents - walletAmountToUseCents,
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
