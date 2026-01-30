
import { Sun, Leaf, ArrowUp } from "lucide-react";

export const getLightInfo = (light: string) => {
  switch (light.toLowerCase()) {
    case 'soleada':
      return { icon: Sun, color: 'bg-yellow-100 text-yellow-700', text: 'Sol' };
    case 'semisol':
      return { icon: Sun, color: 'bg-orange-100 text-orange-700', text: 'Semi-sol' };
    case 'semisombra':
      return { icon: Sun, color: 'bg-blue-100 text-blue-700', text: 'Semi-sombra' };
    case 'sombreada':
      return { icon: Leaf, color: 'bg-green-100 text-green-700', text: 'Sombra' };
    default:
      return { icon: Sun, color: 'bg-gray-100 text-gray-700', text: light };
  }
};

export const getGrowthInfo = (growthRate: string) => {
  switch (growthRate.toLowerCase()) {
    case 'rápido':
      return { icon: ArrowUp, color: 'bg-red-100 text-red-700', text: 'Rápido' };
    case 'medio':
      return { icon: ArrowUp, color: 'bg-yellow-100 text-yellow-700', text: 'Medio' };
    case 'lento':
      return { icon: ArrowUp, color: 'bg-blue-100 text-blue-700', text: 'Lento' };
    default:
      return { icon: ArrowUp, color: 'bg-gray-100 text-gray-700', text: growthRate };
  }
};
