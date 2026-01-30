import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import QuantitySelector from "./QuantitySelector";

interface AddToCartButtonProps {
  plantId: string;
  plantName: string;
  maxQuantity: number;
}

const AddToCartButton = ({ plantId, plantName, maxQuantity }: AddToCartButtonProps) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { addToCart, getItemQuantity } = useCart();
  
  const inCart = getItemQuantity(plantId);
  const availableToAdd = maxQuantity - inCart;

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
    <div className="flex items-center gap-2 sm:gap-3">
      <QuantitySelector
        quantity={selectedQuantity}
        maxQuantity={availableToAdd}
        onChange={setSelectedQuantity}
        size="sm"
      />
      <Button
        onClick={handleAddToCart}
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
      >
        <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
        Añadir
      </Button>
    </div>
  );
};

export default AddToCartButton;
