import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/contexts/CartContext";

export interface ShippingQuote {
  supported: boolean;
  subtotalCents: number;
  shippingCostCents: number;
  totalCents: number;
  totalWeightGrams: number;
  isFreeShipping: boolean;
  amountForFreeShippingCents: number | null;
  freeShippingThresholdCents: number | null;
  shippingBaseCostCents?: number;
  shippingPerItemCostCents?: number;
  shippingItemCount?: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  zoneName: string;
  // Tax breakdown
  vatRate?: number;
  baseImponibleCents?: number;
  taxAmountCents?: number;
  countryCode?: string;
}

interface UseShippingQuoteOptions {
  items: CartItem[];
  countryCode: string | null;
}

export function useShippingQuote({ items, countryCode }: UseShippingQuoteOptions) {
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!countryCode || items.length === 0) {
      setQuote(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cartItems = items.map((item) => ({
        plantId: item.plantId,
        quantity: item.quantity,
      }));

      const { data, error: fnError } = await supabase.functions.invoke(
        "calculate-shipping",
        {
          body: { items: cartItems, countryCode },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to calculate shipping");
      }

      if (data.error && data.error !== "SHIPPING_NOT_AVAILABLE") {
        throw new Error(data.error);
      }

      setQuote(data);
    } catch (err) {
      console.error("Shipping quote error:", err);
      setError(err instanceof Error ? err.message : "Error calculating shipping");
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [items, countryCode]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return { quote, isLoading, error, refetch: fetchQuote };
}
