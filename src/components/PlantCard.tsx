
import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plant } from "@/data/plants";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/contexts/CartContext";

interface PlantCardProps {
  plant: Plant;
}

const PlantCard = ({ plant }: PlantCardProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { addToCart, getItemQuantity } = useCart();
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;
  
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
  
  // State for mobile image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  // Get all available images for this plant
  const allImages = plant.images && plant.images.length > 0 ? plant.images : [];
  const hasMultipleImages = allImages.length > 1;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - touchStartX.current);
    const diffY = Math.abs(currentY - touchStartY.current);
    
    // If horizontal swipe is more prominent than vertical, prevent link navigation
    if (diffX > diffY && diffX > 10) {
      isSwipingRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultipleImages) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const swipeThreshold = 50;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next image
        setCurrentImageIndex(prev => (prev + 1) % allImages.length);
      } else {
        // Swipe right - previous image
        setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
      }
      isSwipingRef.current = true;
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [allImages.length, hasMultipleImages]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent navigation if we were swiping
    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isSwipingRef.current = false;
    }
  }, []);

  const getLightTooltip = (light: string) => {
    switch (light.toLowerCase()) {
      case 'soleada':
        return t('light.sunnyTooltip');
      case 'semisol':
        return t('light.semiSunTooltip');
      case 'semisombra':
        return t('light.semiShadeTooltip');
      case 'sombreada':
        return t('light.shadedTooltip');
      default:
        return t('light.defaultTooltip');
    }
  };

  const getGrowthTooltip = (growth: string) => {
    switch (growth.toLowerCase()) {
      case 'rápido':
        return t('growth.fastTooltip');
      case 'medio':
        return t('growth.mediumTooltip');
      case 'lento':
        return t('growth.slowTooltip');
      default:
        return t('growth.defaultTooltip');
    }
  };

  // Determinar qué imagen usar para el hover
  const getHoverImage = () => {
    if (plant.id === 'cyathea-sp') {
      // Para Cyathea sp., usar la imagen del índice 2 en lugar de la 1
      return plant.images && plant.images[2] ? plant.images[2] : plant.images?.[0];
    }
    // Para todas las demás plantas, usar la imagen del índice 1
    return plant.images && plant.images[1] ? plant.images[1] : plant.images?.[0];
  };

  // En mobile, mostrar siempre la imagen con swipe carousel
  if (isMobile) {
    const currentImage = allImages[currentImageIndex] || getHoverImage();
    
    return (
      <Link 
        to={`/plant/${plant.id}`} 
        className="flex"
        onClick={handleClick}
      >
        <Card className="w-full h-full flex flex-col bg-card/80 backdrop-blur-sm border-border relative overflow-hidden">
          {/* Imagen con swipe carousel */}
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
            {/* Nombre en la parte superior */}
            <div className="absolute top-2 left-2 right-2">
              <span className="bg-secondary/95 text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm inline-block">
                {plant.name}
              </span>
            </div>
            {/* Indicadores de imagen (dots) */}
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
            {/* Precio en la parte inferior */}
            {plant.price !== undefined && (
              <div className="absolute bottom-2 left-2">
                <span className="bg-card/95 text-foreground text-sm font-bold px-2.5 py-1 rounded-lg shadow-sm">
                  {plant.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            )}
            {/* Cantidad disponible */}
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
          
          {/* Info mínima debajo de la imagen */}
          <CardContent className="p-3 flex-1 flex flex-col">
            <p className="text-muted-foreground text-xs italic mb-2">{plant.commonName}</p>
            
            {/* Row con tags y botón de añadir */}
            <div className="flex items-center justify-between mt-auto gap-2">
              {/* Tags de luz y crecimiento */}
              <div className="flex gap-1.5">
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${lightInfo.color}`}>
                  <LightIcon className="h-2.5 w-2.5" />
                </div>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${growthInfo.color}`}>
                  <GrowthIcon className="h-2.5 w-2.5" />
                </div>
              </div>
              
              {/* Botón añadir al carrito */}
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
  }

  // Desktop: comportamiento original con hover
  return (
    <Link to={`/plant/${plant.id}`} className="group flex">
      <Card className="w-full h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105 bg-card/80 backdrop-blur-sm border-border relative overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 h-36 sm:h-40">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight flex-1 pr-2">
              {plant.name}
            </CardTitle>
            {plant.quantity && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {plant.quantity === 1 && (
                  <span className="text-base sm:text-lg">🍂</span>
                )}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full cursor-help ${
                      plant.quantity < 2 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {plant.quantity}x
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="text-left">
                    <div>
                      <p className="font-semibold">{t('plant.availability')}</p>
                      <p>{t('plant.availableQuantity')}: {plant.quantity} {plant.quantity === 1 ? t('plant.unit') : t('plant.units')}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          {plant.variety && <p className="text-xs sm:text-sm font-medium text-primary">{plant.variety}</p>}
          <CardDescription className="text-muted-foreground font-medium text-xs sm:text-sm">
            {plant.commonName}
          </CardDescription>
          {plant.price !== undefined && (
            <p className="text-primary font-semibold text-xs sm:text-sm mt-1">
              {plant.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pb-4 sm:pb-6">
          <div className="flex-1 flex flex-col">
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 flex-1 line-clamp-3">{plant.description}</p>
            
            {/* Visual tags for light and growth - fixed at bottom */}
            <div className="flex gap-1 sm:gap-2 mt-auto flex-wrap">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium cursor-help ${lightInfo.color}`}>
                    <LightIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">{lightInfo.text}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="text-left">
                  <div>
                    <p className="font-semibold">{t('light.title')}</p>
                    <p>{getLightTooltip(plant.light)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium cursor-help ${growthInfo.color}`}>
                    <GrowthIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">{growthInfo.text}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="text-left">
                  <div>
                    <p className="font-semibold">{t('growth.title')}</p>
                    <p>{getGrowthTooltip(plant.growthRate)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Image and button overlay on hover - covers entire card */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col">
            {/* Product image covering entire card */}
            {getHoverImage() && (
              <div className="flex-1 relative">
                <img 
                  src={getHoverImage()} 
                  alt={`${plant.name} - ${t('plant.preview')}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Product name tag - positioned at top with same style as quantity */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
              <span className="bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full shadow-md">
                {plant.name}
              </span>
            </div>
            
            {/* Ver Detalles button - positioned at bottom right */}
            <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6">
              <span className="bg-card/90 text-foreground font-medium text-xs px-2 py-1 rounded-lg hover:bg-muted transition-colors block text-center shadow-lg">
                {t('plant.viewDetails')} →
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PlantCard;
