import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/** Label mapping for filter keys so chips are human readable */
const FILTER_KEY_LABELS: Record<string, Record<string, string>> = {
  plant_type:      { es: "Tipo",          en: "Type" },
  difficulty:      { es: "Dificultad",    en: "Difficulty" },
  rarity:          { es: "Rareza",        en: "Rarity" },
  water:           { es: "Riego",         en: "Watering" },
  humidity:        { es: "Humedad",       en: "Humidity" },
  exposure:        { es: "Exposición",    en: "Exposure" },
  climate_zone:    { es: "Clima",         en: "Climate" },
  hardiness_zone:  { es: "Rusticidad",    en: "Hardiness" },
  hardiness_min:   { es: "Rusticidad mín.", en: "Hardiness min" },
  hardiness_max:   { es: "Rusticidad máx.", en: "Hardiness max" },
  min_temp_max:    { es: "Temp. mín. máx.", en: "Min temp max" },
  climate_fit_min: { es: "Adaptación mín.", en: "Min adaptation" },
  plant_use:       { es: "Uso",           en: "Use" },
  tags:            { es: "Etiqueta",      en: "Tag" },
  origin_country:  { es: "Origen",        en: "Origin" },
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
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  const getLabel = (key: string) => {
    const entry = FILTER_KEY_LABELS[key];
    if (!entry) return key;
    return entry[lang] ?? entry.es ?? key;
  };

  const allChips = Object.entries(filters).flatMap(([key, values]) =>
    values.map(v => ({ key, value: v }))
  );

  if (allChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4" role="list" aria-label={lang === "es" ? "Filtros activos" : "Active filters"}>
      {allChips.map(({ key, value }) => (
        <Badge
          key={`${key}-${value}`}
          variant="secondary"
          className="gap-1 pr-1 capitalize cursor-pointer hover:bg-destructive/10 transition-colors text-xs"
          onClick={() => onRemove(key, value)}
          role="listitem"
        >
          <span className="text-muted-foreground/70 mr-0.5 text-[10px] uppercase">
            {getLabel(key)}:
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
          {lang === "es" ? "Borrar todo" : "Clear all"}
        </Button>
      )}
    </div>
  );
};

export default ActiveFilterChips;
