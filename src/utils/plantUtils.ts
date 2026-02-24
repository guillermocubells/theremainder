
import { Sun, Leaf, ArrowUp } from "lucide-react";

export const getLightInfo = (light: string) => {
  switch (light.toLowerCase()) {
    case 'soleada':
      return { icon: Sun, color: 'bg-warning-muted text-warning-muted-foreground', text: 'Sol' };
    case 'semisol':
      return { icon: Sun, color: 'bg-caution-muted text-caution-muted-foreground', text: 'Semi-sol' };
    case 'semisombra':
      return { icon: Sun, color: 'bg-info-muted text-info-muted-foreground', text: 'Semi-sombra' };
    case 'sombreada':
      return { icon: Leaf, color: 'bg-success-muted text-success-muted-foreground', text: 'Sombra' };
    default:
      return { icon: Sun, color: 'bg-neutral-muted text-neutral-muted-foreground', text: light };
  }
};

export const getGrowthInfo = (growthRate: string) => {
  switch (growthRate.toLowerCase()) {
    case 'rápido':
      return { icon: ArrowUp, color: 'bg-danger-muted text-danger-muted-foreground', text: 'Rápido' };
    case 'medio':
      return { icon: ArrowUp, color: 'bg-warning-muted text-warning-muted-foreground', text: 'Medio' };
    case 'lento':
      return { icon: ArrowUp, color: 'bg-info-muted text-info-muted-foreground', text: 'Lento' };
    default:
      return { icon: ArrowUp, color: 'bg-neutral-muted text-neutral-muted-foreground', text: growthRate };
  }
};
