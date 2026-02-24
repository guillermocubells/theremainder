import { useCallback, useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { CartItem } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { COUNTRY_NAMES } from "@/utils/shippingCalculator";
import { Loader2, AlertCircle } from "lucide-react";

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
  referralCode?: string | null;
  referrerUserId?: string | null;
}

interface CheckoutData {
  clientSecret: string;
  publishableKey: string;
  sessionId: string;
}

export function StripeEmbeddedCheckout({
  items,
  shippingCountry,
  shippingForm,
  referralCode,
}: StripeEmbeddedCheckoutProps) {
  const { i18n, t } = useTranslation();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCheckout = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cartItems = items.map((item) => ({
          plantId: item.plantId,
          quantity: item.quantity,
          image: item.image,
          containerSize: item.containerSize,
        }));

        const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
          body: {
            items: cartItems,
            shippingCountry,
            shippingAddress: {
              ...shippingForm,
              country: COUNTRY_NAMES[shippingCountry] || shippingCountry,
            },
            locale: i18n.language,
            referralCode: referralCode || undefined,
          },
        });

        if (fnError) {
          console.error("Error creating checkout session:", fnError);
          throw new Error(fnError.message || "Failed to create checkout session");
        }

        if (data?.error) {
          console.error("Checkout error:", data.error);
          throw new Error(data.message || data.error);
        }

        if (!data?.clientSecret || !data?.publishableKey) {
          throw new Error("Missing checkout data from server");
        }

        // Checkout session created — proceed to load Stripe
        
        // Load Stripe with the publishable key from the server
        const stripe = loadStripe(data.publishableKey);
        setStripePromise(stripe);
        setCheckoutData({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          sessionId: data.sessionId,
        });
      } catch (err) {
        console.error("Checkout initialization error:", err);
        setError(err instanceof Error ? err.message : "Error initializing payment");
      } finally {
        setIsLoading(false);
      }
    };

    initCheckout();
  }, [items, shippingCountry, shippingForm, i18n.language]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-moss mb-4" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-destructive/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-destructive font-medium mb-2">{t("checkout.errors.paymentFailed")}</p>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  if (!checkoutData || !stripePromise) {
    return null;
  }

  const options = {
    clientSecret: checkoutData.clientSecret,
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
