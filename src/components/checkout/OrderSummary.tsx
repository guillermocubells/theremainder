import { useTranslation } from "react-i18next";
import { ShoppingBag, Truck, Lock, CreditCard, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ShippingQuote } from "@/hooks/useShippingQuote";

interface OrderSummaryProps {
  items: CartItem[];
  quote: ShippingQuote | null;
  isQuoteLoading: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export function OrderSummary({
  items,
  quote,
  isQuoteLoading,
  isSubmitting,
  canSubmit,
}: OrderSummaryProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const formatCurrency = (euros: number) => formatPrice(euros);
  const formatCurrencyCents = (cents: number) => formatPrice(cents / 100);

  // Calculate subtotal from frontend items (for display before quote loads)
  const frontendSubtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Use backend values when available
  const subtotal = quote ? quote.subtotalCents / 100 : frontendSubtotal;
  const shippingCost = quote ? quote.shippingCostCents / 100 : null;
  const total = quote ? quote.totalCents / 100 : null;

  // Calculate tax (21% IVA included)
  const taxRate = 0.21;
  const taxAmount = total ? total - total / (1 + taxRate) : subtotal - subtotal / (1 + taxRate);

  return (
    <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t("checkout.orderSummary")}
      </h2>

      {/* Products list */}
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {items.map((item) => (
          <div key={item.plantId} className="flex gap-3">
            <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-1 italic">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {formatCurrency(item.price)}
              </p>
              {item.containerSize && (
                <p className="text-xs text-muted-foreground">{item.containerSize}</p>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      {/* Totals */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("common.subtotal")}</span>
          <span className="text-foreground">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {t("common.shipping")}
          </span>
          <span className="text-foreground">
            {isQuoteLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : shippingCost !== null ? (
              shippingCost === 0 ? (
                <span className="text-moss font-medium">{t("checkout.free")}</span>
              ) : (
                formatCurrency(shippingCost)
              )
            ) : (
              <span className="text-muted-foreground italic text-xs">
                {t("checkout.selectCountryFirst")}
              </span>
            )}
          </span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-foreground">{t("common.totalWithTax")}</span>
        <span className="font-bold text-xl text-foreground">
          {isQuoteLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : total !== null ? (
            formatCurrency(total)
          ) : (
            formatCurrency(subtotal)
          )}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        {t("common.includedTaxes")}: {formatCurrency(taxAmount)}
      </p>

      {/* Delivery estimate */}
      {quote && quote.supported && (
        <div className="bg-moss/5 rounded-lg p-3 mb-4">
          <p className="text-xs text-moss font-medium">
            {t("checkout.deliveryEstimate", {
              min: quote.deliveryDaysMin,
              max: quote.deliveryDaysMax,
            })}
          </p>
        </div>
      )}

      {/* Payment methods info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Lock className="h-3 w-3" />
        <span>{t("checkout.securePayment")}</span>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-[#635BFF] hover:bg-[#5851DB] text-white"
        disabled={isSubmitting || !canSubmit || isQuoteLoading}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("checkout.processing")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t("checkout.placeOrder")}
          </span>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        {t("checkout.termsNote")}
      </p>
    </div>
  );
}
