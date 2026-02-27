import { SlidersHorizontal, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import FacetSection from "./FacetSection";
import type { SearchFilters, FacetBuckets } from "@/hooks/useSearchCatalog";

/** Human-readable facet group labels */
const FACET_LABELS: Record<string, string> = {
  plant_type: "Tipo de planta",
  difficulty: "Dificultad",
  rarity: "Rareza",
  water: "Riego",
  humidity: "Humedad",
  exposure: "Exposición",
  climate_zones: "Zona climática",
  hardiness_zones: "Zona de rusticidad",
  plant_use: "Uso",
  tags: "Etiquetas",
  origin_country: "Origen",
};

/** Map backend facet keys → filter param keys */
const FACET_TO_FILTER: Record<string, string> = {
  plant_type: "plant_type",
  difficulty: "difficulty",
  rarity: "rarity",
  water: "water",
  humidity: "humidity",
  exposure: "exposure",
  climate_zones: "climate_zone",
  hardiness_zones: "hardiness_zone",
  plant_use: "plant_use",
  tags: "tags",
  origin_country: "origin_country",
};

export interface FacetSidebarProps {
  facets: FacetBuckets;
  filters: SearchFilters;
  activeCount: number;
  onToggleFacet: (facetKey: keyof SearchFilters, value: string) => void;
  onClearFacet: (facetKey: keyof SearchFilters) => void;
  onClearAll: () => void;
  onSetFilters: (fn: (prev: SearchFilters) => SearchFilters) => void;
}

const FacetSidebar = ({
  facets,
  filters,
  activeCount,
  onToggleFacet,
  onClearFacet,
  onClearAll,
  onSetFilters,
}: FacetSidebarProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal">
              ({activeCount} activos)
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs text-muted-foreground hover:text-destructive">
            Limpiar todo
          </Button>
        )}
      </div>

      {/* Price range */}
      <div className="border-b border-border pb-3 space-y-2">
        <span className="text-sm font-medium text-foreground">Precio (€)</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Mín"
            className="h-8 text-xs"
            value={filters.min_price ?? ""}
            onChange={e => {
              const v = e.target.value ? parseFloat(e.target.value) : undefined;
              onSetFilters(prev => ({ ...prev, min_price: v }));
            }}
          />
          <span className="text-muted-foreground text-xs">—</span>
          <Input
            type="number"
            placeholder="Máx"
            className="h-8 text-xs"
            value={filters.max_price ?? ""}
            onChange={e => {
              const v = e.target.value ? parseFloat(e.target.value) : undefined;
              onSetFilters(prev => ({ ...prev, max_price: v }));
            }}
          />
        </div>
      </div>

      {/* Dynamic facets from backend */}
      {Object.entries(facets).map(([facetKey, buckets]) => {
        const filterKey = FACET_TO_FILTER[facetKey] || facetKey;
        const selected = (filters[filterKey as keyof SearchFilters] as string[] | undefined) ?? [];
        return (
          <FacetSection
            key={facetKey}
            label={FACET_LABELS[facetKey] || facetKey}
            buckets={buckets}
            selected={selected}
            onToggle={(value) => onToggleFacet(filterKey as keyof SearchFilters, value)}
            onClear={() => onClearFacet(filterKey as keyof SearchFilters)}
          />
        );
      })}

      {/* Stock filter */}
      <div className="border-b border-border pb-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Checkbox
            checked={filters.in_stock === true}
            onCheckedChange={(checked) =>
              onSetFilters(prev => ({ ...prev, in_stock: checked ? true : undefined }))
            }
            className="h-4 w-4"
          />
          <Package className="h-3.5 w-3.5" />
          Solo disponibles
        </label>
      </div>
    </div>
  );
};

export default FacetSidebar;
