import { useTranslation } from 'react-i18next';
import { ShoppingCart, Check, Plus, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrderPromotion } from '@/hooks/useOrderPromotion';
import { useCart } from '@/contexts/CartContext';
import { Plant } from '@/data/plants';

interface CompleteYourOrderProps {
  /** Hide recommendation cards (e.g. inside compact cart drawer) */
  compact?: boolean;
}

const CompleteYourOrder = ({ compact = false }: CompleteYourOrderProps) => {
  const { t } = useTranslation();
  const promo = useOrderPromotion();
  const { items, addToCart } = useCart();

  // Don't render if cart is empty
  if (items.length === 0) return null;

  const formatCurrency = (v: number) =>
    v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const handleQuickAdd = (plant: Plant) => {
    addToCart({
      plantId: plant.id,
      name: plant.name,
      quantity: 1,
      maxQuantity: plant.quantity,
      price: plant.price ?? 0,
      image: plant.images?.[0],
      containerSize: plant.containerSize,
    });
  };

  // ── Unlocked state ──
  if (promo.isUnlocked) {
    return (
      <div className="rounded-lg border border-moss/30 bg-moss/5 p-3 sm:p-4 flex items-start gap-3">
        <div className="bg-moss/20 rounded-full p-1.5 mt-0.5">
          <Check className="h-4 w-4 text-moss" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            ✅ ¡Descuento desbloqueado!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {promo.discountValue}% de descuento ({formatCurrency(promo.savedAmount)}) se aplicará automáticamente al finalizar.
          </p>
        </div>
      </div>
    );
  }

  // ── Progress state ──
  return (
    <div className="space-y-3">
      {/* Progress banner */}
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-1.5 mt-0.5 flex-shrink-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Completa tu pedido
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Te faltan {formatCurrency(promo.missingAmount)} para desbloquear {promo.discountValue}% de descuento.
            </p>
            <div className="mt-2">
              <Progress
                value={promo.progress}
                className="h-2"
                indicatorClassName="bg-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatCurrency(promo.subtotal)} / {formatCurrency(promo.threshold)}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation cards */}
      {!compact && promo.recommendations.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Aprovecha estos artículos para llegar al mínimo:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {promo.recommendations.slice(0, compact ? 3 : 6).map((plant) => (
              <Card
                key={plant.id}
                className="overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-200"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {plant.images?.[0] ? (
                    <img
                      src={plant.images[0]}
                      alt={plant.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2 sm:p-3">
                  <h4 className="text-xs sm:text-sm font-medium text-foreground line-clamp-1">
                    {plant.name}
                  </h4>
                  {plant.commonName && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {plant.commonName}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {formatCurrency(plant.price ?? 0)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleQuickAdd(plant)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      Añadir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteYourOrder;
