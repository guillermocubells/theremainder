import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Plant } from "@/data/plants";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { getMainImage, getDisplayImages } from "@/utils/plantImageUtils";
import { usePlantTooltips } from "@/hooks/usePlantTooltips";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

interface DesktopPlantCardProps {
  plant: Plant;
}

const DesktopPlantCard = ({ plant }: DesktopPlantCardProps) => {
  const { t } = useTranslation();
  const { getLightTooltip, getGrowthTooltip } = usePlantTooltips();
  const { formatPrice } = useCurrency();
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;

  const getHoverImage = () => {
    const dispImages = getDisplayImages(plant.images, plant.productImages);
    if (dispImages.length > 1) return dispImages[1];
    return dispImages[0];
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/plant/${plant.id}`;
    const shareData = {
      title: plant.name,
      text: plant.commonName || plant.name,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('share.linkCopied', 'Enlace copiado'));
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('share.linkCopied', 'Enlace copiado'));
      }
    }
  };

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
              {formatPrice(plant.price)}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col pb-4 sm:pb-6">
          <div className="flex-1 flex flex-col">
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 flex-1 line-clamp-3">{plant.description}</p>
            
            {/* Light and growth tags */}
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

          {/* Hover overlay with image */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col">
          {getHoverImage() && (
              <div className="flex-1 relative">
                <OptimizedImage 
                  src={getHoverImage()} 
                  alt={`${plant.name} - ${t('plant.preview')}`}
                  className="w-full h-full object-cover"
                  placeholder={false}
                />
              </div>
            )}
            
            {/* Name badge */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
              <span className="bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full shadow-md">
                {plant.name}
              </span>
            </div>
            
            {/* Share button - visible on hover */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShare}
                  aria-label={t('share.shareProduct', 'Compartir producto')}
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('share.shareProduct', 'Compartir producto')}
              </TooltipContent>
            </Tooltip>
            
            {/* View details button */}
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

export default DesktopPlantCard;
