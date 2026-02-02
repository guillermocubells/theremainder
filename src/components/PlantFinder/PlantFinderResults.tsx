import { useState } from 'react';
import { Plant } from '@/data/plants';
import PlantCard from '@/components/PlantCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RotateCcw, Edit2, Sparkles, Bookmark, Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSavedSearch } from '@/hooks/useSavedSearches';
import { PlantFinderAnswers } from './types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PlantFinderResultsProps {
  plants: Plant[];
  activeFilters: string[];
  answers: PlantFinderAnswers;
  onReset: () => void;
  onEditAnswers: () => void;
}

const PlantFinderResults = ({ 
  plants, 
  activeFilters, 
  answers,
  onReset, 
  onEditAnswers
}: PlantFinderResultsProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const createSavedSearch = useCreateSavedSearch();
  
  const hasActiveFilters = Object.values(answers).some(v => v !== null);

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error('Introduce un nombre para la búsqueda');
      return;
    }

    try {
      await createSavedSearch.mutateAsync({
        name: searchName.trim(),
        filters: answers,
      });
      toast.success('Búsqueda guardada. Puedes verla en tu cuenta.');
      setShowSaveDialog(false);
      setSearchName('');
    } catch (error) {
      toast.error('Error al guardar la búsqueda');
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Recomendaciones para tu espacio
          </h2>
          <div className="flex items-center justify-center gap-2 text-primary">
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
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
            className="text-muted-foreground"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
          
          {/* Save search button for logged in users */}
          {user && hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="text-primary border-primary/30 hover:bg-primary/5"
            >
              <Bookmark className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          )}
        </div>
        
        {/* Login prompt for guests */}
        {!user && hasActiveFilters && (
          <p className="text-sm text-muted-foreground text-center">
            <a href="/auth" className="text-primary hover:underline font-medium">
              Inicia sesión
            </a>
            {' '}para guardar esta búsqueda
          </p>
        )}

        {/* Save search dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar búsqueda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Ej: Plantas para mi terraza"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Podrás acceder a esta búsqueda desde tu cuenta en "Búsquedas guardadas"
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSearch}
                disabled={createSavedSearch.isPending || !searchName.trim()}
              >
                {createSavedSearch.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results grid */}
        {plants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted rounded-xl">
            <p className="text-muted-foreground mb-4">
              Prueba a ajustar tus criterios o reiniciar la búsqueda
            </p>
            <Button
              onClick={onReset}
              variant="outline"
              className="text-primary border-primary/30"
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
