import { Plant } from '@/data/plants';
import PlantCard from '@/components/PlantCard';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit2, Sparkles } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

interface PlantFinderResultsProps {
  plants: Plant[];
  activeFilters: string[];
  onReset: () => void;
  onEditAnswers: () => void;
}

const PlantFinderResults = ({ 
  plants, 
  activeFilters, 
  onReset, 
  onEditAnswers
}: PlantFinderResultsProps) => {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Recomendaciones para tu espacio
          </h2>
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">
              {plants.length === 0 
                ? 'Basado en tu clima y espacio, no encontramos plantas que coincidan exactamente con tus criterios'
                : `Basado en tu clima y espacio, tenemos ${plants.length} ${plants.length === 1 ? 'planta que encaja' : 'plantas que encajan'} con lo que buscas`
              }
            </span>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {activeFilters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {filter}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditAnswers}
            className="text-gray-600"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-gray-600"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
        </div>

        {/* Results grid */}
        {plants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-600 mb-4">
              Prueba a ajustar tus criterios o reiniciar la búsqueda
            </p>
            <Button
              onClick={onReset}
              variant="outline"
              className="text-green-600 border-green-300"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Empezar de nuevo
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PlantFinderResults;
