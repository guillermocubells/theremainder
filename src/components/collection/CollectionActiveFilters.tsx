import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OwnedPlantsFilters, PlantStatus } from "@/hooks/collection/useOwnedPlants";
import { PlantLocation } from "@/hooks/collection/usePlantLocations";

const STATUS_LABELS: Record<PlantStatus, string> = {
  alive: "Viva",
  dormant: "Latente",
  sick: "Enferma",
  removed: "Eliminada",
};

interface CollectionActiveFiltersProps {
  filters: OwnedPlantsFilters;
  locations: PlantLocation[];
  onFiltersChange: (f: OwnedPlantsFilters) => void;
}

const CollectionActiveFilters = ({
  filters,
  locations,
  onFiltersChange,
}: CollectionActiveFiltersProps) => {
  const chips: { key: keyof OwnedPlantsFilters; label: string; display: string }[] = [];

  if (filters.status) {
    chips.push({
      key: "status",
      label: "Estado",
      display: STATUS_LABELS[filters.status],
    });
  }
  if (filters.location_id) {
    const loc = locations.find((l) => l.id === filters.location_id);
    chips.push({
      key: "location_id",
      label: "Ubicación",
      display: loc?.name || filters.location_id,
    });
  }
  if (filters.tag) {
    chips.push({ key: "tag", label: "Etiqueta", display: filters.tag });
  }
  if (filters.search) {
    chips.push({ key: "search", label: "Búsqueda", display: `"${filters.search}"` });
  }

  if (chips.length === 0) return null;

  const handleRemove = (key: keyof OwnedPlantsFilters) => {
    const next = { ...filters };
    delete next[key];
    onFiltersChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4" role="list" aria-label="Filtros activos">
      {chips.map(({ key, label, display }) => (
        <Badge
          key={key}
          variant="secondary"
          className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10 transition-colors text-xs"
          onClick={() => handleRemove(key)}
          role="listitem"
        >
          <span className="text-muted-foreground/70 mr-0.5 text-[10px] uppercase">{label}:</span>
          {display}
          <X className="h-3 w-3 ml-0.5" />
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
        >
          Borrar todo
        </Button>
      )}
    </div>
  );
};

export default CollectionActiveFilters;
