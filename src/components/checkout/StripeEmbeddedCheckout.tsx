import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { CartItem } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { COUNTRY_NAMES } from "@/utils/shippingCalculator";
import { Loader2 } from "lucide-react";

// Load Stripe outside component to avoid recreating on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface ShippingForm {
  email: string;
  fullName: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
  province: string;
  notes: string;
}

interface StripeEmbeddedCheckoutProps {
  items: CartItem[];
  shippingCountry: string;
  shippingForm: ShippingForm;
}

export function StripeEmbeddedCheckout({
  items,
  shippingCountry,
  shippingForm,
}: StripeEmbeddedCheckoutProps) {
  const { i18n } = useTranslation();

  const fetchClientSecret = useCallback(async () => {
    const cartItems = items.map((item) => ({
      plantId: item.plantId,
      quantity: item.quantity,
      image: item.image,
      containerSize: item.containerSize,
    }));

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items: cartItems,
        shippingCountry,
        shippingAddress: {
          ...shippingForm,
          country: COUNTRY_NAMES[shippingCountry] || shippingCountry,
        },
        locale: i18n.language,
      },
    });

    if (error) {
      console.error("Error creating checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (data?.error) {
      console.error("Checkout error:", data.error);
      throw new Error(data.message || data.error);
    }

    if (!data?.clientSecret) {
      throw new Error("No client secret returned");
    }

    return data.clientSecret;
  }, [items, shippingCountry, shippingForm, i18n.language]);

  const options = { fetchClientSecret };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
