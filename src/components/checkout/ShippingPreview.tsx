import { useTranslation } from "react-i18next";
import { Truck, Gift, Package, Loader2 } from "lucide-react";
import { ShippingQuote } from "@/hooks/useShippingQuote";

interface ShippingPreviewProps {
  quote: ShippingQuote | null;
  isLoading: boolean;
  error: string | null;
  countryCode: string | null;
}

export function ShippingPreview({ quote, isLoading, error, countryCode }: ShippingPreviewProps) {
  const { t } = useTranslation();

  if (!countryCode) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <Truck className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {t("checkout.selectCountryForShipping")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-moss" />
        <span className="text-sm text-muted-foreground">
          {t("checkout.calculatingShipping")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!quote || !quote.supported) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
        <Truck className="h-8 w-8 text-destructive/50 mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">
          {t("checkout.noShippingAvailable")}
        </p>
        <p className="text-xs text-destructive/70 mt-1">
          {t("checkout.noShippingAvailableDesc")}
        </p>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
    });
  };

  return (
    <div className="bg-moss/5 border border-moss/20 rounded-lg p-4 space-y-3">
      {/* Shipping cost */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-moss" />
          <span className="text-sm font-medium">
            {quote.isFreeShipping
              ? t("checkout.freeShipping")
              : t("checkout.standardShipping")}
          </span>
        </div>
        <span className={`text-sm font-semibold ${quote.isFreeShipping ? "text-moss" : ""}`}>
          {quote.isFreeShipping ? t("checkout.free") : formatCurrency(quote.shippingCostCents)}
        </span>
      </div>

      {/* Delivery estimate */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="h-3 w-3" />
        <span>
          {t("checkout.deliveryEstimate", {
            min: quote.deliveryDaysMin,
            max: quote.deliveryDaysMax,
          })}
        </span>
      </div>

      {/* Free shipping progress */}
      {!quote.isFreeShipping && quote.amountForFreeShippingCents && quote.amountForFreeShippingCents > 0 && (
        <div className="border-t border-moss/10 pt-3">
          <div className="flex items-center gap-2 text-xs">
            <Gift className="h-3 w-3 text-moss" />
            <span className="text-muted-foreground">
              {t("checkout.freeShippingProgress", {
                amount: formatCurrency(quote.amountForFreeShippingCents),
              })}
            </span>
          </div>
          {quote.freeShippingThresholdCents && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-moss rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    ((quote.freeShippingThresholdCents - quote.amountForFreeShippingCents) /
                      quote.freeShippingThresholdCents) *
                      100
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Weight info */}
      <div className="text-xs text-muted-foreground/70 pt-1 border-t border-moss/10">
        {t("checkout.totalWeight", {
          weight: (quote.totalWeightGrams / 1000).toFixed(1),
        })}
      </div>
    </div>
  );
}
