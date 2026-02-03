import { useState, useRef } from 'react';
import { PlantItem, PlantItemStatus } from '@/hooks/garden/types';
import { KanbanColumn, KanbanColumnId } from './KanbanColumn';
import { Heart, Leaf, Eye, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMoveWishlistItem } from '@/hooks/wishlist/useWishlistItems';
import { useUpdateOwnedPlant } from '@/hooks/collection/useOwnedPlants';

interface GardenKanbanProps {
  items: PlantItem[];
}

// Column configuration
const columns: {
  id: KanbanColumnId;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  emptyMessage: string;
  statuses: PlantItemStatus[];
  sourceTypes?: ('wishlist' | 'owned' | 'stock_notification')[];
}[] = [
  {
    id: 'searching',
    title: 'En búsqueda',
    icon: <Heart className="h-4 w-4 text-destructive" />,
    colorClass: 'bg-destructive/10',
    emptyMessage: 'Añade plantas que deseas conseguir',
    statuses: ['searching', 'available'],
    sourceTypes: ['wishlist', 'stock_notification'],
  },
  {
    id: 'in_collection',
    title: 'En colección',
    icon: <Leaf className="h-4 w-4 text-primary" />,
    colorClass: 'bg-primary/10',
    emptyMessage: 'Tus plantas aparecerán aquí',
    statuses: ['in_collection'],
    sourceTypes: ['owned'],
  },
  {
    id: 'watching',
    title: 'En observación',
    icon: <Eye className="h-4 w-4 text-accent-foreground" />,
    colorClass: 'bg-accent',
    emptyMessage: 'Plantas con viabilidad media o condiciones delicadas',
    statuses: ['in_collection'],
    sourceTypes: ['owned'],
  },
  {
    id: 'archived',
    title: 'Ya no disponibles',
    icon: <Archive className="h-4 w-4 text-muted-foreground" />,
    colorClass: 'bg-muted',
    emptyMessage: 'Plantas perdidas, regaladas o que ya no existen',
    statuses: ['archived'],
  },
];

// Helper to categorize items into columns
const categorizeItems = (items: PlantItem[]): Record<KanbanColumnId, PlantItem[]> => {
  const result: Record<KanbanColumnId, PlantItem[]> = {
    searching: [],
    in_collection: [],
    watching: [],
    archived: [],
  };

  items.forEach(item => {
    // Archived items
    if (item.status === 'archived') {
      result.archived.push(item);
      return;
    }

    // Searching items (wishlist + stock notifications)
    if (item.sourceType === 'wishlist' || item.sourceType === 'stock_notification') {
      if (item.status !== 'in_collection') {
        result.searching.push(item);
        return;
      }
    }

    // Owned plants - determine if watching or in collection
    if (item.sourceType === 'owned' && item.status === 'in_collection') {
      // Check if plant needs watching (sick status or concerning observation)
      const needsWatching = 
        item.collectionData?.plantStatus === 'sick' ||
        item.collectionData?.plantStatus === 'dormant' ||
        item.collectionData?.lastObservation?.condition === 'concern' ||
        item.collectionData?.lastObservation?.condition === 'critical';
      
      if (needsWatching) {
        result.watching.push(item);
      } else {
        result.in_collection.push(item);
      }
      return;
    }

    // Default to searching for any remaining items
    result.searching.push(item);
  });

  return result;
};

export const GardenKanban = ({ items }: GardenKanbanProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const moveWishlist = useMoveWishlistItem();
  const updateOwned = useUpdateOwnedPlant();

  const categorizedItems = categorizeItems(items);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  const scrollTo = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleDrop = (itemId: string, targetColumnId: KanbanColumnId) => {
    // Find the item
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Determine action based on source and target
    if (item.sourceType === 'wishlist') {
      if (targetColumnId === 'in_collection') {
        // Mark as acquired
        moveWishlist.mutate({
          id: item.sourceId,
          status: 'acquired',
        }, {
          onSuccess: () => {
            toast.success('¡Planta movida a tu colección!');
          },
        });
      } else if (targetColumnId === 'archived') {
        toast.info('Las plantas en búsqueda no pueden archivarse directamente. Elimínalas si ya no te interesan.');
      }
    } else if (item.sourceType === 'owned') {
      if (targetColumnId === 'archived') {
        // Archive the plant
        updateOwned.mutate({
          id: item.sourceId,
          status: 'removed',
        }, {
          onSuccess: () => {
            toast.success('Planta archivada');
          },
        });
      } else if (targetColumnId === 'watching') {
        // Mark as sick for observation
        updateOwned.mutate({
          id: item.sourceId,
          status: 'sick',
        }, {
          onSuccess: () => {
            toast.success('Planta movida a observación');
          },
        });
      } else if (targetColumnId === 'in_collection') {
        // Mark as alive
        updateOwned.mutate({
          id: item.sourceId,
          status: 'alive',
        }, {
          onSuccess: () => {
            toast.success('Planta restaurada a colección');
          },
        });
      }
    } else if (item.sourceType === 'stock_notification') {
      toast.info('Las alertas de stock no pueden moverse. Añádelas a tu wishlist primero.');
    }
  };

  return (
    <div className="relative">
      {/* Scroll buttons for mobile/tablet */}
      <div className="md:hidden flex justify-between items-center mb-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => scrollTo('left')}
          disabled={!canScrollLeft}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Desliza para ver más columnas
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => scrollTo('right')}
          disabled={!canScrollRight}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Kanban container */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory",
          "md:grid md:grid-cols-4 md:overflow-x-visible md:snap-none",
          "scrollbar-hide"
        )}
        onScroll={handleScroll}
      >
        {columns.map((column) => (
          <div key={column.id} className="snap-start flex-shrink-0 flex-grow-0 w-[85vw] md:w-full md:min-w-0">
            <KanbanColumn
              id={column.id}
              title={column.title}
              items={categorizedItems[column.id]}
              icon={column.icon}
              colorClass={column.colorClass}
              emptyMessage={column.emptyMessage}
              onDrop={handleDrop}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
