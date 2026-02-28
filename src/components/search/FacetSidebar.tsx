import { SlidersHorizontal, Package, Thermometer, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import FacetSection from "./FacetSection";
import type { SearchFilters, FacetBuckets } from "@/hooks/useSearchCatalog";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import LocationSelector from "./LocationSelector";
import { useTranslation } from "react-i18next";

/** Human-readable facet group labels */
const FACET_LABELS: Record<string, Record<string, string>> = {
  plant_type:      { es: "Tipo de planta",     en: "Plant type" },
  difficulty:      { es: "Dificultad",          en: "Difficulty" },
  rarity:          { es: "Rareza",              en: "Rarity" },
  water:           { es: "Riego",               en: "Watering" },
  humidity:        { es: "Humedad",             en: "Humidity" },
  exposure:        { es: "Exposición",          en: "Exposure" },
  climate_zones:   { es: "Zona climática",      en: "Climate zone" },
  hardiness_zones: { es: "Zona de rusticidad",  en: "Hardiness zone" },
  plant_use:       { es: "Uso",                 en: "Use" },
  tags:            { es: "Etiquetas",           en: "Tags" },
  origin_country:  { es: "Origen",              en: "Origin" },
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

/** Simplified zone codes for the range selectors */
const ZONE_OPTIONS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
];

/** Climate fit threshold presets */
const FIT_PRESETS = [
  { value: 0, labelEs: "Sin filtro",   labelEn: "No filter" },
  { value: 5, labelEs: "≥ 5 Aceptable", labelEn: "≥ 5 Acceptable" },
  { value: 6, labelEs: "≥ 6 Buena",    labelEn: "≥ 6 Good" },
  { value: 7, labelEs: "≥ 7 Muy buena", labelEn: "≥ 7 Very good" },
  { value: 8, labelEs: "≥ 8 Excelente", labelEn: "≥ 8 Excellent" },
];

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
  const { i18n } = useTranslation();
  const isEs = i18n.language.startsWith("es");
  const { location } = useLocationPreference();

  const hasClimateFilters =
    !!filters.hardiness_min || !!filters.hardiness_max ||
    filters.climate_fit_min != null || filters.min_temp_max != null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {isEs ? "Filtros" : "Filters"}
          {activeCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal">
              ({activeCount} {isEs ? "activos" : "active"})
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs text-muted-foreground hover:text-destructive">
            {isEs ? "Limpiar todo" : "Clear all"}
          </Button>
        )}
      </div>

      {/* ═══ Climate fit section ═══ */}
      <div className="border-b border-border pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {isEs ? "Adaptación climática" : "Climate fit"}
          </span>
          {hasClimateFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] text-muted-foreground hover:text-destructive px-1"
              onClick={() =>
                onSetFilters((prev) => {
                  const { hardiness_min, hardiness_max, climate_fit_min, min_temp_max, address_id, ...rest } = prev;
                  return rest;
                })
              }
            >
              {isEs ? "Limpiar" : "Clear"}
            </Button>
          )}
        </div>

        {/* Location context */}
        <div className="flex items-center gap-1.5">
          <LocationSelector compact />
          {location?.climate?.hardiness && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {isEs ? "Zona" : "Zone"} {location.climate.hardiness}
            </Badge>
          )}
        </div>

        {/* Hardiness range */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {isEs ? "Rango de rusticidad (USDA)" : "Hardiness range (USDA)"}
          </label>
          <div className="flex items-center gap-2">
            <Select
              value={filters.hardiness_min || ""}
              onValueChange={(v) =>
                onSetFilters((prev) => ({
                  ...prev,
                  hardiness_min: v || undefined,
                  ...(location?.addressId ? { address_id: location.addressId } : {}),
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs flex-1" aria-label={isEs ? "Zona mínima" : "Min zone"}>
                <SelectValue placeholder={isEs ? "Mín" : "Min"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {ZONE_OPTIONS.map((z) => (
                  <SelectItem key={z} value={z}>
                    {isEs ? "Zona" : "Zone"} {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">–</span>
            <Select
              value={filters.hardiness_max || ""}
              onValueChange={(v) =>
                onSetFilters((prev) => ({
                  ...prev,
                  hardiness_max: v || undefined,
                  ...(location?.addressId ? { address_id: location.addressId } : {}),
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs flex-1" aria-label={isEs ? "Zona máxima" : "Max zone"}>
                <SelectValue placeholder={isEs ? "Máx" : "Max"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {ZONE_OPTIONS.map((z) => (
                  <SelectItem key={z} value={z}>
                    {isEs ? "Zona" : "Zone"} {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Climate fit threshold */}
        <div className="space-y-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                {isEs ? "Adaptación mínima" : "Min. adaptation"}
              </label>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">
                {isEs
                  ? "Filtra plantas con una puntuación de adaptación climática igual o superior al valor seleccionado (escala 1-10)."
                  : "Filter plants with a climate adaptation score at or above the selected value (1-10 scale)."}
              </p>
            </TooltipContent>
          </Tooltip>
          <Select
            value={filters.climate_fit_min != null ? String(filters.climate_fit_min) : "0"}
            onValueChange={(v) => {
              const num = Number(v);
              onSetFilters((prev) => ({
                ...prev,
                climate_fit_min: num > 0 ? num : undefined,
                ...(location?.addressId ? { address_id: location.addressId } : {}),
              }));
            }}
          >
            <SelectTrigger className="h-8 text-xs" aria-label={isEs ? "Adaptación climática mínima" : "Minimum climate fit"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIT_PRESETS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {isEs ? p.labelEs : p.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min temp ceiling */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {isEs ? "Temp. mínima tolerable (°C)" : "Min tolerable temp (°C)"}
          </label>
          <Input
            type="number"
            placeholder={isEs ? "Ej: -10" : "E.g. -10"}
            className="h-8 text-xs"
            value={filters.min_temp_max ?? ""}
            onChange={(e) => {
              const v = e.target.value ? parseFloat(e.target.value) : undefined;
              onSetFilters((prev) => ({ ...prev, min_temp_max: v }));
            }}
            aria-label={isEs ? "Temperatura mínima máxima tolerable" : "Maximum minimum tolerable temperature"}
          />
        </div>
      </div>

      {/* Price range */}
      <div className="border-b border-border pb-3 space-y-2">
        <span className="text-sm font-medium text-foreground">
          {isEs ? "Precio (€)" : "Price (€)"}
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={isEs ? "Mín" : "Min"}
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
            placeholder={isEs ? "Máx" : "Max"}
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
        const labels = FACET_LABELS[facetKey];
        return (
          <FacetSection
            key={facetKey}
            label={labels ? (isEs ? labels.es : labels.en) : facetKey}
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
          {isEs ? "Solo disponibles" : "In stock only"}
        </label>
      </div>
    </div>
  );
};

export default FacetSidebar;
