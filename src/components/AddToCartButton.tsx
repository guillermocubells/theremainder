import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import QuantitySelector from "./QuantitySelector";

interface AddToCartButtonProps {
  plantId: string;
  plantName: string;
  maxQuantity: number;
  onQuantityChange?: (quantity: number) => void;
}

const AddToCartButton = ({ plantId, plantName, maxQuantity, onQuantityChange }: AddToCartButtonProps) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { addToCart, getItemQuantity } = useCart();
  const { t } = useTranslation();
  
  const inCart = getItemQuantity(plantId);
  const availableToAdd = maxQuantity - inCart;

  useEffect(() => {
    onQuantityChange?.(selectedQuantity);
  }, [selectedQuantity, onQuantityChange]);

  const handleQuantityChange = (quantity: number) => {
    setSelectedQuantity(quantity);
  };

  const handleAddToCart = () => {
    if (selectedQuantity > 0 && selectedQuantity <= availableToAdd) {
      addToCart(plantId, plantName, selectedQuantity, maxQuantity);
      setSelectedQuantity(1);
    }
  };

  if (availableToAdd <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
          Ya tienes {inCart} en el carrito (máximo disponible)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <QuantitySelector
        quantity={selectedQuantity}
        maxQuantity={availableToAdd}
        onChange={handleQuantityChange}
        size="default"
      />
      <Button
        onClick={handleAddToCart}
        size="lg"
        className="bg-rose-600 hover:bg-rose-700 text-white text-sm sm:text-base px-6 sm:px-8"
      >
        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        {t('plant.addToCart')}
      </Button>
    </div>
  );
};

export default AddToCartButton;
