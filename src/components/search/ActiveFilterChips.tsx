import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Label mapping for filter keys so chips are human readable */
const FILTER_KEY_LABELS: Record<string, string> = {
  plant_type: "Tipo",
  difficulty: "Dificultad",
  rarity: "Rareza",
  water: "Riego",
  humidity: "Humedad",
  exposure: "Exposición",
  climate_zone: "Clima",
  hardiness_zone: "Rusticidad",
  plant_use: "Uso",
  tags: "Etiqueta",
  origin_country: "Origen",
};

export interface ActiveFilterChipsProps {
  /** Map of filterKey → selected values[] */
  filters: Record<string, string[]>;
  /** Remove a single value from a filter key */
  onRemove: (key: string, value: string) => void;
  /** Clear all filters */
  onClear: () => void;
}

const ActiveFilterChips = ({ filters, onRemove, onClear }: ActiveFilterChipsProps) => {
  const allChips = Object.entries(filters).flatMap(([key, values]) =>
    values.map(v => ({ key, value: v }))
  );

  if (allChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4" role="list" aria-label="Filtros activos">
      {allChips.map(({ key, value }) => (
        <Badge
          key={`${key}-${value}`}
          variant="secondary"
          className="gap-1 pr-1 capitalize cursor-pointer hover:bg-destructive/10 transition-colors text-xs"
          onClick={() => onRemove(key, value)}
          role="listitem"
        >
          <span className="text-muted-foreground/70 mr-0.5 text-[10px] uppercase">
            {FILTER_KEY_LABELS[key] ?? key}:
          </span>
          {value.replace(/_/g, " ")}
          <X className="h-3 w-3 ml-0.5" />
        </Badge>
      ))}
      {allChips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
        >
          Borrar todo
        </Button>
      )}
    </div>
  );
};

export default ActiveFilterChips;
