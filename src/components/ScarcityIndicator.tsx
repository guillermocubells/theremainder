import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";

interface ScarcityIndicatorProps {
  quantity: number;
  threshold?: number;
}

const ScarcityIndicator = ({ quantity, threshold = 3 }: ScarcityIndicatorProps) => {
  const { t } = useTranslation();

  if (quantity <= 0 || quantity > threshold) return null;

  return (
    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium animate-fade-in">
      <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
      <span>
        {quantity === 1
          ? t('scarcity.lastUnit', '¡Última unidad disponible!')
          : t('scarcity.fewLeft', { count: quantity, defaultValue: `¡Solo quedan ${quantity} unidades!` })}
      </span>
    </div>
  );
};

export default ScarcityIndicator;
