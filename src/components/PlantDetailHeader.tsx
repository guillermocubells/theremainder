
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";
import { ExternalLink, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHardinessZones, getZoneCountLabel } from "@/utils/hardinessZones";
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
}

interface PlantDetailHeaderProps {
  plant: Plant;
  origin?: string;
  climate?: string;
}

const PlantDetailHeader = ({ plant, origin, climate }: PlantDetailHeaderProps) => {
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;

  const getLightTooltip = (light: string) => {
    switch (light.toLowerCase()) {
      case 'soleada':
        return 'Necesita luz solar directa durante la mayor parte del día';
      case 'semisol':
        return 'Prefiere luz solar parcial, unas 4-6 horas al día';
      case 'semisombra':
        return 'Tolera sombra parcial con algo de luz filtrada';
      case 'sombreada':
        return 'Prefiere áreas con poca luz directa o sombra completa';
      default:
        return 'Requerimientos de luz específicos';
    }
  };

  const getGrowthTooltip = (growth: string) => {
    switch (growth.toLowerCase()) {
      case 'rápido':
        return 'Crecimiento acelerado, verás cambios notables en poco tiempo';
      case 'medio':
        return 'Crecimiento moderado, desarrollo constante a ritmo normal';
      case 'lento':
        return 'Crecimiento pausado, requiere paciencia pero muy gratificante';
      default:
        return 'Ritmo de crecimiento específico';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-green-200 mb-6 sm:mb-8 relative">
      {/* External link button - top right */}
      <Button 
        asChild
        variant="outline" 
        size="sm"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400 text-xs sm:text-sm"
      >
        <a 
          href={plant.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Ver más información</span>
          <span className="sm:hidden">Info</span>
        </a>
      </Button>

      <div className="flex flex-col space-y-4 pr-20 sm:pr-40">
        {/* Title and basic info */}
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {plant.name}
          </h1>
          
          {plant.variety && (
            <p className="text-base sm:text-lg font-medium text-green-600 mb-1">{plant.variety}</p>
          )}
          <p className="text-lg sm:text-xl text-gray-600 font-medium mb-3">{plant.commonName}</p>
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
                <p className="font-semibold">Luz</p>
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
                <p className="font-semibold">Crecimiento</p>
                <p className="text-xs sm:text-sm">{getGrowthTooltip(plant.growthRate)}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {plant.quantity && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 cursor-help">
                  <span>{plant.quantity}x disponibles</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-left">
                <div>
                  <p className="font-semibold">Disponibilidad</p>
                  <p className="text-xs sm:text-sm">Cantidad disponible: {plant.quantity} {plant.quantity === 1 ? 'unidad' : 'unidades'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {plant.hardinessZones && plant.hardinessZones.length > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-help">
                  <Thermometer className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{formatHardinessZones(plant.hardinessZones)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-left max-w-xs">
                <div>
                  <p className="font-semibold">Zona de Rusticidad</p>
                  <p className="text-xs sm:text-sm">{getZoneCountLabel(plant.hardinessZones)}</p>
                  <p className="text-xs text-gray-500 mt-1">Indica la tolerancia al frío según la clasificación USDA</p>
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
                <span className="font-medium">Origen:</span> {origin}
              </span>
            )}
            {climate && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Clima:</span> {climate}
              </span>
            )}
            {plant.location && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Ideal para:</span> {plant.location}
              </span>
            )}
          </div>
        )}

        {/* Notes in green box with title - now more responsive */}
        {plant.notes && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <h3 className="font-bold text-green-800 mb-2 text-sm sm:text-base">Notas:</h3>
            <p className="text-gray-700 leading-relaxed text-xs sm:text-sm lg:text-base">{plant.notes}</p>
          </div>
        )}

        {/* Add to cart button */}
        {plant.quantity && Number(plant.quantity) > 0 && (
          <div className="pt-6 sm:pt-8">
            <AddToCartButton
              plantId={plant.id}
              plantName={plant.name}
              maxQuantity={Number(plant.quantity)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantDetailHeader;
