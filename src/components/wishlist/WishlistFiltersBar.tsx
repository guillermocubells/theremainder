import { WishlistFilters, WishlistPriority, WishlistSource } from '@/hooks/wishlist';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface WishlistFiltersBarProps {
  filters: WishlistFilters;
  onFiltersChange: (filters: WishlistFilters) => void;
}

export const WishlistFiltersBar = ({ filters, onFiltersChange }: WishlistFiltersBarProps) => {
  const hasFilters = filters.priority || filters.source || filters.search;

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar plantas..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          priority: value === 'all' ? undefined : value as WishlistPriority 
        })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda prioridad</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Media</SelectItem>
          <SelectItem value="low">Baja</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.source || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          source: value === 'all' ? undefined : value as WishlistSource 
        })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Proveedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier origen</SelectItem>
          <SelectItem value="frondaprima">Solo Frondaprima</SelectItem>
          <SelectItem value="specific">Proveedor específico</SelectItem>
          <SelectItem value="any">Cualquiera</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
};
