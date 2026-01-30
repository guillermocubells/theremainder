import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  plantId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  containerSize?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  shippingAddress: {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { items, shippingAddress, locale = "es" }: CheckoutRequest = await req.json();

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    if (!shippingAddress || !shippingAddress.email) {
      throw new Error("Shipping address with email is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user is authenticated (optional for guest checkout)
    let userId: string | null = null;
    let customerEmail = shippingAddress.email;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        customerEmail = data.user.email || shippingAddress.email;
      }
    }

    // Check if a Stripe customer record exists for this email
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          description: item.containerSize || undefined,
          images: item.image ? [item.image] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://wedding-gift-botanicals.lovable.app";

    // Create Stripe Checkout session with European payment methods
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: "payment",
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
        allowed_countries: [
          "ES", "PT", "FR", "DE", "IT", "NL", "BE", "AT", "IE", "LU",
          "GR", "FI", "SE", "DK", "PL", "CZ", "SK", "HU", "RO", "BG",
          "HR", "SI", "EE", "LV", "LT", "MT", "CY"
        ],
      },
      locale: locale === "es" ? "es" : "en",
      metadata: {
        user_id: userId || "guest",
        shipping_email: shippingAddress.email,
        shipping_name: shippingAddress.fullName,
        shipping_phone: shippingAddress.phone || "",
        shipping_street: shippingAddress.street,
        shipping_apartment: shippingAddress.apartment || "",
        shipping_postal_code: shippingAddress.postalCode,
        shipping_city: shippingAddress.city,
        shipping_province: shippingAddress.province,
        shipping_country: shippingAddress.country,
        shipping_notes: shippingAddress.notes || "",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
