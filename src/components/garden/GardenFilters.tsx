import { GardenFilter } from '@/hooks/garden/types';
import { cn } from '@/lib/utils';
import { Heart, Leaf, Archive } from 'lucide-react';

interface GardenFiltersProps {
  activeFilter: GardenFilter;
  onChange: (filter: GardenFilter) => void;
  stats: {
    searching: number;
    inCollection: number;
    archived: number;
    total: number;
  };
}

const filters: { id: GardenFilter; label: string; icon?: typeof Leaf }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'searching', label: 'En búsqueda', icon: Heart },
  { id: 'in_collection', label: 'En colección', icon: Leaf },
  { id: 'archived', label: 'Archivadas', icon: Archive },
];

export const GardenFilters = ({ activeFilter, onChange, stats }: GardenFiltersProps) => {
  const getCount = (filter: GardenFilter): number => {
    switch (filter) {
      case 'all': return stats.total;
      case 'searching': return stats.searching;
      case 'in_collection': return stats.inCollection;
      case 'archived': return stats.archived;
      default: return 0;
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = getCount(filter.id);
        const Icon = filter.icon;
        
        return (
          <button
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{filter.label}</span>
            {count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 text-xs rounded-full min-w-5 text-center",
                isActive ? "bg-primary-foreground/20" : "bg-background"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default GardenFilters;
