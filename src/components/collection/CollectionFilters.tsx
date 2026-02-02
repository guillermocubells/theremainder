import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search } from 'lucide-react';
import { OwnedPlantsFilters, PlantStatus } from '@/hooks/collection/useOwnedPlants';
import { PlantLocation } from '@/hooks/collection/usePlantLocations';

interface CollectionFiltersProps {
  filters: OwnedPlantsFilters;
  onFiltersChange: (filters: OwnedPlantsFilters) => void;
  locations: PlantLocation[];
  tags: string[];
  onClose: () => void;
}

const statusOptions: { value: PlantStatus; label: string }[] = [
  { value: 'alive', label: 'Viva' },
  { value: 'dormant', label: 'Latente' },
  { value: 'sick', label: 'Enferma' },
  { value: 'removed', label: 'Eliminada' },
];

const CollectionFilters = ({ 
  filters, 
  onFiltersChange, 
  locations, 
  tags,
  onClose 
}: CollectionFiltersProps) => {
  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== undefined && v !== '');

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Filtros</h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, especie..."
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Status */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                status: value === 'all' ? null : value as PlantStatus 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Location */}
          <div className="space-y-2">
            <Label>Ubicación</Label>
            <Select
              value={filters.location_id || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                location_id: value === 'all' ? null : value 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las ubicaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiqueta</Label>
            <Select
              value={filters.tag || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                tag: value === 'all' ? null : value 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las etiquetas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etiquetas</SelectItem>
                {tags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionFilters;
