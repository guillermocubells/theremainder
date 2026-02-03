import { Button } from '@/components/ui/button';
import { Leaf, Search, Archive, Plus } from 'lucide-react';
import { GardenFilter } from '@/hooks/garden/types';

interface GardenEmptyStateProps {
  filter: GardenFilter;
  onAddPlant: () => void;
  onSearchCatalog: () => void;
}

const emptyStates: Record<GardenFilter, {
  icon: typeof Leaf;
  title: string;
  description: string;
  action: 'add' | 'search' | 'none';
}> = {
  all: {
    icon: Leaf,
    title: 'Tu jardín está vacío',
    description: 'Empieza añadiendo plantas que ya tienes o buscando nuevas especies que te gustaría cultivar.',
    action: 'add',
  },
  searching: {
    icon: Search,
    title: 'No tienes plantas en búsqueda',
    description: 'Activa alertas en productos agotados del catálogo o añade plantas externas que quieras conseguir. Te avisaremos cuando estén disponibles.',
    action: 'search',
  },
  in_collection: {
    icon: Leaf,
    title: 'Tu colección está vacía',
    description: 'Aquí aparecerán las plantas que compres en FrondaPrima automáticamente, o puedes añadir cualquier planta externa que ya tengas.',
    action: 'add',
  },
  archived: {
    icon: Archive,
    title: 'No tienes plantas archivadas',
    description: 'Las plantas que hayas perdido o ya no cultives aparecerán aquí como recuerdo.',
    action: 'none',
  },
};

export const GardenEmptyState = ({ filter, onAddPlant, onSearchCatalog }: GardenEmptyStateProps) => {
  const state = emptyStates[filter];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {state.title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {state.description}
      </p>
      
      {state.action === 'add' && (
        <Button onClick={onAddPlant}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir planta
        </Button>
      )}
      
      {state.action === 'search' && (
        <Button onClick={onSearchCatalog}>
          <Search className="h-4 w-4 mr-2" />
          Explorar catálogo
        </Button>
      )}
    </div>
  );
};

export default GardenEmptyState;
