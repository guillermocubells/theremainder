import { useTranslation } from "react-i18next";
import { ShoppingBag, Truck, Lock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ShippingQuote } from "@/hooks/useShippingQuote";
import { useState } from "react";
import { cn } from "@/lib/utils";
import CompleteYourOrder from "@/components/CompleteYourOrder";

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  quote: ShippingQuote | null;
  isQuoteLoading: boolean;
}

export function CheckoutOrderSummary({
  items,
  quote,
  isQuoteLoading,
}: CheckoutOrderSummaryProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatPrice } = useCurrency();

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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Mobile collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full p-4 flex items-center justify-between bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-moss" />
          <span className="font-medium text-foreground">
            {t("checkout.orderSummary")} ({totalItems})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">
            {isQuoteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : total !== null ? (
              formatPrice(total)
            ) : (
              formatPrice(subtotal)
            )}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content - always visible on desktop, collapsible on mobile */}
      <div className={cn(
        "lg:block",
        isExpanded ? "block" : "hidden"
      )}>
        <div className="p-4 lg:p-6">
          <h2 className="hidden lg:block text-lg font-semibold text-foreground mb-4">
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
                    {item.quantity} × {formatPrice(item.price)}
                  </p>
                  {item.containerSize && (
                    <p className="text-xs text-muted-foreground">{item.containerSize}</p>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common.subtotal")}</span>
              <span className="text-foreground">{formatPrice(subtotal)}</span>
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
                    formatPrice(shippingCost)
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
                formatPrice(total)
              ) : (
                formatPrice(subtotal)
              )}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            {t("common.includedTaxes")}: {formatPrice(taxAmount)}
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

          {/* Promotion block */}
          <div className="mb-4">
            <CompleteYourOrder compact />
          </div>

          {/* Secure payment info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>{t("checkout.securePayment")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
