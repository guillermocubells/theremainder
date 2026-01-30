import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuantitySelectorProps {
  quantity: number;
  maxQuantity: number;
  onChange: (quantity: number) => void;
  size?: "sm" | "default";
}

const QuantitySelector = ({ quantity, maxQuantity, onChange, size = "default" }: QuantitySelectorProps) => {
  const decrease = () => {
    if (quantity > 1) {
      onChange(quantity - 1);
    }
  };

  const increase = () => {
    if (quantity < maxQuantity) {
      onChange(quantity + 1);
    }
  };

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`${buttonSize} border-green-300 hover:bg-green-50 hover:border-green-400`}
        onClick={decrease}
        disabled={quantity <= 1}
      >
        <Minus className={iconSize} />
      </Button>
      <span className={`${textSize} font-medium w-8 text-center text-gray-800`}>
        {quantity}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`${buttonSize} border-green-300 hover:bg-green-50 hover:border-green-400`}
        onClick={increase}
        disabled={quantity >= maxQuantity}
      >
        <Plus className={iconSize} />
      </Button>
    </div>
  );
};

export default QuantitySelector;
