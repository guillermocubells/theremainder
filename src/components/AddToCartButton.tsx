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
  price: number;
  image?: string;
  containerSize?: string;
  onQuantityChange?: (quantity: number) => void;
}

const AddToCartButton = ({ 
  plantId, 
  plantName, 
  maxQuantity, 
  price,
  image,
  containerSize,
  onQuantityChange 
}: AddToCartButtonProps) => {
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
      addToCart({
        plantId,
        name: plantName,
        quantity: selectedQuantity,
        maxQuantity,
        price,
        image,
        containerSize
      });
      setSelectedQuantity(1);
    }
  };

  // Product is out of stock (maxQuantity is 0)
  if (maxQuantity === 0) {
    return (
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          disabled
          size="lg"
          className="bg-muted text-muted-foreground cursor-not-allowed text-sm sm:text-base px-6 sm:px-8"
        >
          {t('plant.notAvailable', 'No disponible')}
        </Button>
      </div>
    );
  }

  // User already has max quantity in cart
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
