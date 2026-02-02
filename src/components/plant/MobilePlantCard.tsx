import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plant } from "@/data/plants";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { useCart } from "@/contexts/CartContext";
import { useImageCarousel } from "@/hooks/useImageCarousel";

interface MobilePlantCardProps {
  plant: Plant;
}

const MobilePlantCard = ({ plant }: MobilePlantCardProps) => {
  const { t } = useTranslation();
  const { addToCart, getItemQuantity } = useCart();
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;

  const allImages = plant.images && plant.images.length > 0 ? plant.images : [];
  const hasMultipleImages = allImages.length > 1;

  const {
    currentIndex: currentImageIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleClick
  } = useImageCarousel({ imagesCount: allImages.length });

  const currentQuantityInCart = getItemQuantity(plant.id);
  const availableStock = (plant.quantity || 0) - currentQuantityInCart;
  const canAddToCart = availableStock > 0;

  const handleAddToCart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canAddToCart) return;
    
    addToCart({
      plantId: plant.id,
      name: plant.name,
      quantity: 1,
      maxQuantity: plant.quantity || 1,
      price: plant.price || 0,
      image: plant.images?.[0],
      containerSize: plant.containerSize
    });
  };

  const currentImage = allImages[currentImageIndex] || plant.images?.[0];

  return (
    <Link 
      to={`/plant/${plant.id}`} 
      className="flex"
      onClick={handleClick}
    >
      <Card className="w-full h-full flex flex-col bg-card/80 backdrop-blur-sm border-border relative overflow-hidden">
        {/* Image with swipe carousel */}
        <div 
          className="relative aspect-[4/3] overflow-hidden touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {currentImage && (
            <img 
              src={currentImage} 
              alt={`${plant.name} - ${currentImageIndex + 1}/${allImages.length}`}
              className="w-full h-full object-cover transition-opacity duration-200"
              draggable={false}
            />
          )}
          
          {/* Name badge */}
          <div className="absolute top-2 left-2 right-2">
            <span className="bg-secondary/95 text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm inline-block">
              {plant.name}
            </span>
          </div>
          
          {/* Image indicators */}
          {hasMultipleImages && (
            <div className="absolute top-2 right-2 flex gap-1">
              {allImages.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentImageIndex 
                      ? 'bg-white shadow-md scale-110' 
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Price */}
          {plant.price !== undefined && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-card/95 text-foreground text-sm font-bold px-2.5 py-1 rounded-lg shadow-sm">
                {plant.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}
          
          {/* Stock quantity */}
          {plant.quantity && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              {plant.quantity === 1 && <span className="text-sm">🍂</span>}
              <span className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm ${
                plant.quantity < 2 
                  ? 'bg-amber-50/95 text-amber-700 border border-amber-200' 
                  : 'bg-secondary/95 text-secondary-foreground'
              }`}>
                {plant.quantity}x
              </span>
            </div>
          )}
        </div>
        
        {/* Info section */}
        <CardContent className="p-3 flex-1 flex flex-col">
          <p className="text-muted-foreground text-xs italic mb-2">{plant.commonName}</p>
          
          <div className="flex items-center justify-between mt-auto gap-2">
            {/* Light and growth tags */}
            <div className="flex gap-1.5">
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${lightInfo.color}`}>
                <LightIcon className="h-2.5 w-2.5" />
              </div>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${growthInfo.color}`}>
                <GrowthIcon className="h-2.5 w-2.5" />
              </div>
            </div>
            
            {/* Add to cart button */}
            <Button
              size="sm"
              variant={canAddToCart ? "default" : "secondary"}
              onClick={handleAddToCart}
              onTouchEnd={handleAddToCart}
              disabled={!canAddToCart}
              className="h-7 px-2.5 text-xs gap-1 shrink-0"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {currentQuantityInCart > 0 ? (
                <span>{currentQuantityInCart}</span>
              ) : (
                <span>{t('cart.add')}</span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default MobilePlantCard;
