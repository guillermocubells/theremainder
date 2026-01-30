
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plant } from "@/data/plants";
import { getLightInfo, getGrowthInfo } from "@/utils/plantUtils";

interface PlantCardProps {
  plant: Plant;
}

const PlantCard = ({ plant }: PlantCardProps) => {
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
      <Card className="w-full h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/80 backdrop-blur-sm border-green-200 relative overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 h-36 sm:h-40">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-base sm:text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors leading-tight flex-1 pr-2">
              {plant.name}
            </CardTitle>
            {plant.quantity && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full cursor-help ${
                      plant.quantity < 2 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {plant.quantity}x
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="text-left">
                    <div>
                      <p className="font-semibold">Disponibilidad</p>
                      <p>Cantidad disponible: {plant.quantity} {plant.quantity === 1 ? 'unidad' : 'unidades'}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                {plant.quantity === 1 && (
                  <span className="text-xs text-amber-600/80">
                    🍂
                  </span>
                )}
              </div>
            )}
          </div>
          {plant.variety && <p className="text-xs sm:text-sm font-medium text-green-600">{plant.variety}</p>}
          <CardDescription className="text-gray-600 font-medium text-xs sm:text-sm">
            {plant.commonName}
          </CardDescription>
          {plant.price !== undefined && (
            <p className="text-green-700 font-semibold text-xs sm:text-sm mt-1">
              {plant.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pb-4 sm:pb-6">
          <div className="flex-1 flex flex-col">
            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 flex-1 line-clamp-3">{plant.description}</p>
            
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
                    <p className="font-semibold">Luz</p>
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
                    <p className="font-semibold">Crecimiento</p>
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
                  alt={`${plant.name} - vista previa`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Product name tag - positioned at top with same style as quantity */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
              <span className="bg-green-100 text-green-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full shadow-md">
                {plant.name}
              </span>
            </div>
            
            {/* Ver Detalles button - positioned at bottom right */}
            <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6">
              <span className="bg-white/90 text-gray-700 font-medium text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors block text-center shadow-lg">
                Ver Detalles →
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PlantCard;
