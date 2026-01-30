import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { ExternalLink, Thermometer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHardinessZones, getZoneCountLabel } from "@/utils/hardinessZones";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AddToCartButton from "./AddToCartButton";

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
  containerSize?: string;
  germinationDate?: string;
  price?: number;
}

interface PlantDetailHeaderProps {
  plant: Plant;
  origin?: string;
  climate?: string;
}

const PlantDetailHeader = ({ plant, origin, climate }: PlantDetailHeaderProps) => {
  const { t } = useTranslation();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;

  const totalPrice = plant.price !== undefined ? plant.price * selectedQuantity : undefined;

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
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-green-200 h-full">
      <div className="flex flex-col space-y-4">
        {/* Title row with external link button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
              {plant.name}
            </h1>
          </div>
          <Button 
            asChild
            variant="outline" 
            size="sm"
            className="flex-shrink-0 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400 text-xs sm:text-sm"
          >
            <a 
              href={plant.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('plant.viewMoreInfo')}</span>
              <span className="sm:hidden">{t('plant.infoSpecies')}</span>
            </a>
          </Button>
        </div>

        {/* Variety and common name */}
        <div>
          {plant.variety && (
            <p className="text-base sm:text-lg font-medium text-green-600 mb-1">{plant.variety}</p>
          )}
          <p className="text-lg sm:text-xl text-gray-600 font-medium">{plant.commonName}</p>
        </div>

        {/* Tags - now responsive */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium cursor-help ${lightInfo.color}`}>
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
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium cursor-help ${growthInfo.color}`}>
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

          {plant.quantity && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 cursor-help">
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

          {plant.hardinessZones && plant.hardinessZones.length > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-help">
                  <Thermometer className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{formatHardinessZones(plant.hardinessZones)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-left max-w-xs">
                <div>
                  <p className="font-semibold">{t('hardiness.title')}</p>
                  <p className="text-xs sm:text-sm">{getZoneCountLabel(plant.hardinessZones)}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('hardiness.tooltip')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">{plant.description}</p>
        
        {/* Origin, climate and location information */}
        {(origin || climate || plant.location) && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
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
            {plant.location && (
              <span className="flex items-center gap-1">
                <span className="font-medium">{t('plant.idealFor')}:</span> {plant.location}
              </span>
            )}
          </div>
        )}

        {/* Notes as collapsible */}
        {plant.notes && (
          <Collapsible className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 sm:p-4 hover:bg-green-100/50 transition-colors">
              <h3 className="font-bold text-green-800 text-sm sm:text-base">{t('plant.notes')}</h3>
              <ChevronDown className="h-4 w-4 text-green-700 transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <p className="text-gray-700 leading-relaxed text-xs sm:text-sm lg:text-base">{plant.notes}</p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Product Details as collapsible */}
        {(plant.containerSize || plant.germinationDate) && (
          <Collapsible className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 sm:p-4 hover:bg-gray-100/50 transition-colors">
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                {t('plant.productDetails')}
              </h3>
              <ChevronDown className="h-4 w-4 text-gray-600 transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {plant.containerSize && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {t('specifications.container')}
                    </span>
                    <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-green-800 border-2 border-green-600 rounded transition-all duration-200 hover:bg-green-50">
                      {plant.containerSize}
                    </span>
                  </div>
                )}
                {plant.germinationDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {t('plant.germinationDate')}
                    </span>
                    <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-green-800 border-2 border-green-600 rounded transition-all duration-200 hover:bg-green-50">
                      {plant.germinationDate}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Price and Add to cart button */}
        {plant.quantity && Number(plant.quantity) > 0 && (
          <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            {totalPrice !== undefined && (
              <p className="text-2xl sm:text-3xl font-bold text-green-700 transition-all duration-200">
                {totalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
            )}
            <AddToCartButton
              plantId={plant.id}
              plantName={plant.name}
              maxQuantity={Number(plant.quantity)}
              onQuantityChange={setSelectedQuantity}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantDetailHeader;
