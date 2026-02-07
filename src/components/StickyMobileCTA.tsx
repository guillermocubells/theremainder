import { ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";

interface StickyMobileCTAProps {
  plantId: string;
  plantName: string;
  price: number;
  maxQuantity: number;
  image?: string;
  containerSize?: string;
}

const StickyMobileCTA = ({ plantId, plantName, price, maxQuantity, image, containerSize }: StickyMobileCTAProps) => {
  const { t } = useTranslation();
  const { addToCart, getItemQuantity } = useCart();
  const { formatPrice } = useCurrency();

  const inCart = getItemQuantity(plantId);
  const availableToAdd = maxQuantity - inCart;
  const isOutOfStock = maxQuantity === 0;

  const handleAdd = () => {
    if (availableToAdd > 0) {
      addToCart({ plantId, name: plantName, quantity: 1, maxQuantity, price, image, containerSize });
    }
  };

  if (isOutOfStock) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-bold text-primary">{formatPrice(price)}</span>
          <span className="text-[10px] text-muted-foreground">IVA incl.</span>
        </div>
        {availableToAdd > 0 ? (
          <Button
            onClick={handleAdd}
            className="bg-rose-600 hover:bg-rose-700 text-white px-6"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {inCart > 0 ? `${t('plant.addToCart')} (${inCart})` : t('plant.addToCart')}
          </Button>
        ) : (
          <span className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
            {t('cart.maxReached', 'Máximo en carrito')}
          </span>
        )}
      </div>
    </div>
  );
};

export default StickyMobileCTA;
