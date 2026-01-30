
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plant } from "@/data/plants";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";

interface PlantCardProps {
  plant: Plant;
}

const PlantCard = ({ plant }: PlantCardProps) => {
  const { t } = useTranslation();
  const lightInfo = getLightInfo(plant.light);
  const growthInfo = getGrowthInfo(plant.growthRate);
  const LightIcon = lightInfo.icon;
  const GrowthIcon = growthInfo.icon;

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
