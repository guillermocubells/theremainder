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
      <Card
        className="w-full h-full flex flex-col bg-card/90 backdrop-blur-sm border border-border/40 relative overflow-hidden"
        style={{
          transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px 0 hsl(var(--foreground) / 0.04), 0 1px 2px -1px hsl(var(--foreground) / 0.04)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(-4px)';
          el.style.boxShadow = '0 12px 28px -6px hsl(var(--foreground) / 0.10), 0 4px 12px -4px hsl(var(--foreground) / 0.06), 0 0 16px -4px hsl(var(--primary) / 0.08)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = '0 1px 3px 0 hsl(var(--foreground) / 0.04), 0 1px 2px -1px hsl(var(--foreground) / 0.04)';
        }}
      >
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 h-36 sm:h-40">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight flex-1 pr-2">
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
            <p className="text-primary font-semibold text-xs sm:text-sm mt-1 transition-all duration-200 group-hover:font-bold">
              {formatPrice(plant.price)}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col pb-4 sm:pb-6">
          <div className="flex-1 flex flex-col">
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 flex-1 line-clamp-3">{plant.description}</p>
            
            {/* Light and growth tags — tech badge style */}
            <div className="flex gap-1 sm:gap-2 mt-auto flex-wrap">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium cursor-help border border-transparent transition-all duration-200 group-hover:border-current/10 ${lightInfo.color}`}
                    style={{ transition: 'border-color 200ms, box-shadow 200ms' }}
                  >
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
                  <div
                    className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium cursor-help border border-transparent transition-all duration-200 group-hover:border-current/10 ${growthInfo.color}`}
                    style={{ transition: 'border-color 200ms, box-shadow 200ms' }}
                  >
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
              <div className="flex-1 relative overflow-hidden">
                <OptimizedImage 
                  src={getHoverImage()} 
                  alt={`${plant.name} - ${t('plant.preview')}`}
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  placeholder={false}
                  responsiveHint={768}
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                {/* Subtle depth gradient at bottom */}
                <div
                  className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, hsl(var(--card) / 0.55), transparent)' }}
                />
              </div>
            )}
            
            {/* Name badge */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
              <span className="bg-secondary/90 backdrop-blur-sm text-secondary-foreground text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full shadow-md border border-border/20">
                {plant.name}
              </span>
            </div>
            
            {/* Share button - visible on hover */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShare}
                  aria-label={t('share.shareProduct', 'Compartir producto')}
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md border border-border/20"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {t('share.shareProduct', 'Compartir producto')}
              </TooltipContent>
            </Tooltip>
            
            {/* View details button — Glassy CTA */}
            <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6">
              <span
                className="font-medium text-xs px-3 py-1.5 rounded-lg block text-center text-foreground border border-border/30"
                style={{
                  background: 'hsl(var(--card) / 0.78)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: 'box-shadow 200ms cubic-bezier(0.4,0,0.2,1), transform 200ms cubic-bezier(0.4,0,0.2,1), background 200ms',
                  boxShadow: '0 2px 8px -2px hsl(var(--foreground) / 0.08)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = '0 0 12px -2px hsl(var(--primary) / 0.25), 0 4px 12px -4px hsl(var(--foreground) / 0.10)';
                  el.style.transform = 'scale(1.02)';
                  el.style.background = 'hsl(var(--card) / 0.88)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = '0 2px 8px -2px hsl(var(--foreground) / 0.08)';
                  el.style.transform = 'scale(1)';
                  el.style.background = 'hsl(var(--card) / 0.78)';
                }}
              >
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
