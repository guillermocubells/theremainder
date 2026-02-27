import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Leaf, Search, Lightbulb, TrendingUp, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchFilters } from "@/hooks/useSearchCatalog";

// ── Suggested queries when search returns nothing ────────────────────
const POPULAR_QUERIES = [
  "Palmera", "Helecho", "Tropical", "Interior", "Cactus",
  "Raro", "Sombra", "Resistente", "Exterior",
];

const RECOVERY_TIPS = [
  { icon: SlidersHorizontal, text: "Prueba a eliminar filtros activos para ampliar la búsqueda" },
  { icon: Search, text: "Revisa la ortografía o usa términos más generales" },
  { icon: Lightbulb, text: "Busca por nombre científico o nombre común" },
];

interface ZeroResultsRecoveryProps {
  query: string | undefined;
  activeFilterCount: number;
  onClearFilters: () => void;
  onSuggestedQuery: (q: string) => void;
}

const ZeroResultsRecovery = ({
  query,
  activeFilterCount,
  onClearFilters,
  onSuggestedQuery,
}: ZeroResultsRecoveryProps) => {
  // Pick suggestions that differ from the current query
  const suggestions = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    return POPULAR_QUERIES.filter(s => s.toLowerCase() !== q).slice(0, 6);
  }, [query]);

  return (
    <div className="text-center py-12 sm:py-16 max-w-lg mx-auto">
      <Leaf className="h-14 w-14 text-muted-foreground/20 mx-auto mb-5" />

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Sin resultados
        {query && (
          <span className="font-normal text-muted-foreground">
            {" "}para &ldquo;{query}&rdquo;
          </span>
        )}
      </h3>

      <p className="text-sm text-muted-foreground mb-6">
        No encontramos plantas que coincidan con tu búsqueda.
      </p>

      {/* Recovery tips */}
      <div className="space-y-2.5 mb-8 text-left">
        {RECOVERY_TIPS.map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <tip.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary/60" />
            <span>{tip.text}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Borrar {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
          </Button>
        )}
        {query && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSuggestedQuery("")}
            className="gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            Ver todo el catálogo
          </Button>
        )}
      </div>

      {/* Suggested queries */}
      <div className="border-t border-border pt-6">
        <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Búsquedas populares
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map(s => (
            <Badge
              key={s}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors px-3 py-1 text-xs"
              onClick={() => onSuggestedQuery(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ZeroResultsRecovery;
