import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { ExternalLink, Thermometer, ChevronDown, Heart, MapPin, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatHardinessZones, getZoneCountLabel, getZoneTemperatureRange } from "@/utils/hardinessZones";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AddToCartButton from "./AddToCartButton";
import StockNotificationButton from "./StockNotificationButton";
import SocialShareButtons from "./SocialShareButtons";
import TrustBadges from "./TrustBadges";
import ScarcityIndicator from "./ScarcityIndicator";
import { useCatalogFavorite } from "@/hooks/wishlist";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface Plant {
  id: string;
  name: string;
  variety?: string;
  commonName: string;
  description: string;
  quantity?: string | number;
  light: string;
  growthRate: string;
  link: string;
  location: string;
  notes: string;
  hardinessZones?: string[];
  climateZones?: string[];
  containerSize?: string;
  germinationDate?: string;
  price?: number;
  images?: string[];
}

interface PlantDetailHeaderProps {
  plant: Plant;
  origin?: string;
  climate?: string;
}

const PlantDetailHeader = ({ plant, origin, climate }: PlantDetailHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;
  
  const { isFavorite, isToggling, toggleFavorite } = useCatalogFavorite(plant.id);
  const { formatPrice } = useCurrency();

  const totalPrice = plant.price !== undefined ? plant.price * selectedQuantity : undefined;

  const handleFavoriteClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    toggleFavorite({
      name: plant.name,
      scientificName: plant.commonName,
      imageUrl: plant.images?.[0],
      price: plant.price,
    });
  };

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

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border h-full w-full flex flex-col">
      <div className="flex flex-col space-y-4 flex-1">
        {/* Title row with favorite button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {plant.name}
            </h1>
            {/* Common name - shown below title on mobile */}
            <p className="text-base sm:hidden text-muted-foreground font-medium">{plant.commonName}</p>
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile favorite button - right aligned */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavoriteClick}
              disabled={isToggling}
              className={cn(
                "h-9 w-9 rounded-full transition-colors sm:hidden",
                isFavorite 
                  ? "text-destructive hover:text-destructive/80" 
                  : "text-muted-foreground hover:text-destructive"
              )}
            >
              <Heart 
                className={cn("h-5 w-5", isFavorite && "fill-current")} 
              />
            </Button>
            
            {/* Desktop favorite button with tooltip */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteClick}
                  disabled={isToggling}
                  className={cn(
                    "h-10 w-10 rounded-full transition-colors hidden sm:flex",
                    isFavorite 
                      ? "text-destructive hover:text-destructive/80" 
                      : "text-muted-foreground hover:text-destructive"
                  )}
                >
                  <Heart 
                    className={cn("h-6 w-6", isFavorite && "fill-current")} 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isFavorite ? 'Quitar de favoritos' : 'Añadir a Mi Jardín'}
              </TooltipContent>
            </Tooltip>
            
            {/* External link button - desktop only */}
            <Button 
              asChild
              variant="outline" 
              size="sm"
              className="hidden sm:flex text-primary border-border hover:bg-secondary hover:border-primary/30 text-xs sm:text-sm"
            >
              <a 
                href={plant.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t('plant.viewMoreInfo')}</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Variety and common name - desktop only (mobile shown inline above) */}
        <div className="hidden sm:block">
          {plant.variety && (
            <p className="text-base sm:text-lg font-medium text-primary mb-1">{plant.variety}</p>
          )}
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">{plant.commonName}</p>
        </div>
        
        {/* Variety - mobile only (common name already shown above) */}
        {plant.variety && (
          <p className="text-base font-medium text-primary sm:hidden">{plant.variety}</p>
        )}

        {/* External link button - mobile only, positioned above tags */}
        <Button 
          asChild
          variant="outline" 
          size="sm"
          className="sm:hidden w-fit text-primary border-border hover:bg-secondary hover:border-primary/30 text-xs"
        >
          <a 
            href={plant.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            <span>{t('plant.infoSpecies')}</span>
          </a>
        </Button>

        {/* Tags - now responsive */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium cursor-default ${lightInfo.color}`}>
                <LightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{lightInfo.text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="text-left">
              <div>
                <p className="font-semibold">{t('light.title')}</p>
                <p className="text-xs sm:text-sm">{getLightTooltip(plant.light)}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium cursor-default ${growthInfo.color}`}>
                <GrowthIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{growthInfo.text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="text-left">
              <div>
                <p className="font-semibold">{t('growth.title')}</p>
                <p className="text-xs sm:text-sm">{getGrowthTooltip(plant.growthRate)}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {plant.quantity && Number(plant.quantity) > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground cursor-default">
                  <span>{plant.quantity}x {t('plant.available')}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-left">
                <div>
                  <p className="font-semibold">{t('plant.availability')}</p>
                  <p className="text-xs sm:text-sm">{t('plant.availableQuantity')}: {plant.quantity} {plant.quantity === 1 ? t('plant.unit') : t('plant.units')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Climate Zones badge */}
          {plant.climateZones && plant.climateZones.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground border border-border cursor-default capitalize">
                  <CloudSun className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Clima: {plant.climateZones.join(', ')}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-left max-w-xs">
                <p className="font-semibold text-sm">Zona climática</p>
                <p className="text-xs text-muted-foreground">Tipo de clima donde esta planta prospera naturalmente.</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* USDA Hardiness Zones badge */}
          {plant.hardinessZones && plant.hardinessZones.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-accent text-accent-foreground border border-border cursor-default">
                  <Thermometer className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{formatHardinessZones(plant.hardinessZones)}</span>
                </div>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="text-left max-w-sm w-auto p-3">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">{t('hardiness.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('hardiness.suitableIntro')}</p>
                  <div className="space-y-2.5 pt-1">
                    {plant.hardinessZones.map((zoneCode) => {
                      const range = getZoneTemperatureRange(zoneCode);
                      const desc = t(`hardiness.zoneDescriptions.${zoneCode.toLowerCase()}`, '');
                      return (
                        <div key={zoneCode} className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">
                            <span className="font-bold">{t('hardiness.zoneLabel', 'Zona')} {zoneCode.toUpperCase()}</span>
                            {range && (
                              <span className="text-muted-foreground font-normal">
                                {' → '}{t('hardiness.minTemp')}{' '}
                                {range.fromTemp !== null ? `${range.fromTemp}°C` : ''}
                                {range.fromTemp !== null && range.toTemp !== null ? ` ${t('hardiness.and')} ` : ''}
                                {range.toTemp !== null ? `${range.toTemp > 0 ? '+' : ''}${range.toTemp}°C` : ''}
                              </span>
                            )}
                          </p>
                          {desc && (
                            <p className="text-xs text-muted-foreground pl-3">{desc}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        {/* Social share buttons */}
        <div className="pt-1">
          <SocialShareButtons 
            plantName={plant.name} 
            plantId={plant.id} 
            price={plant.price} 
            variety={plant.variety}
            containerSize={plant.containerSize}
            quantity={plant.quantity !== undefined ? Number(plant.quantity) : undefined}
            description={plant.description}
            imageUrl={plant.images?.[0]}
          />
        </div>
        
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">{plant.description}</p>
        
        {/* Origin, climate and location information */}
        {(origin || climate || plant.location) && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            {origin && (
              <span className="flex items-center gap-1">
                <span className="font-medium">{t('plant.origin')}:</span> {origin}
              </span>
            )}
            {climate && (
              <span className="flex items-center gap-1">
                <span className="font-medium">{t('plant.climate')}:</span> {climate}
              </span>
            )}
          </div>
        )}

        {/* Notes as collapsible */}
        {plant.notes && (
          <Collapsible className="bg-secondary border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 sm:p-4 hover:bg-muted/50 transition-colors">
              <h3 className="font-bold text-foreground text-sm sm:text-base">{t('plant.notes')}</h3>
              <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm lg:text-base">{plant.notes}</p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Product Details as collapsible */}
        {(plant.containerSize || plant.germinationDate) && (
          <Collapsible className="bg-muted border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 sm:p-4 hover:bg-muted/80 transition-colors">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {t('plant.productDetails')}
              </h3>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {plant.containerSize && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t('specifications.container')}
                    </span>
                    <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-secondary-foreground border-2 border-primary rounded transition-all duration-200 hover:bg-secondary">
                      {plant.containerSize}
                    </span>
                  </div>
                )}
                {plant.germinationDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t('plant.germinationDate')}
                    </span>
                    <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-secondary-foreground border-2 border-primary rounded transition-all duration-200 hover:bg-secondary">
                      {plant.germinationDate}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Scarcity indicator */}
        {plant.quantity && Number(plant.quantity) > 0 && Number(plant.quantity) <= 3 && (
          <ScarcityIndicator quantity={Number(plant.quantity)} />
        )}

        {/* Price and Add to cart button OR Stock Notification */}
        {plant.quantity && Number(plant.quantity) > 0 ? (
          <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
            {totalPrice !== undefined && (
              <div className="flex items-baseline gap-2 min-w-[120px] sm:min-w-[140px]">
                <p className="text-2xl sm:text-3xl font-bold text-primary transition-all duration-200">
                  {formatPrice(totalPrice)}
                </p>
                <span className="text-xs sm:text-sm text-muted-foreground/70">
                  IVA incl.
                </span>
              </div>
            )}
            <AddToCartButton
              plantId={plant.id}
              plantName={plant.name}
              maxQuantity={Number(plant.quantity)}
              price={plant.price || 0}
              image={plant.images?.[0]}
              containerSize={plant.containerSize}
              onQuantityChange={setSelectedQuantity}
            />
          </div>
        ) : (
          <div className="pt-4 sm:pt-6 flex flex-col gap-3">
            <p className="text-base sm:text-lg text-muted-foreground font-medium">
              {t('stockNotification.outOfStock')}
            </p>
            <StockNotificationButton plantId={plant.id} />
          </div>
        )}

        {/* Trust badges */}
        <TrustBadges />
      </div>
    </div>
  );
};

export default PlantDetailHeader;
