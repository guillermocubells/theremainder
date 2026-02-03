import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Send, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecommendPlants, RecommendFilters, CatalogPlant } from "@/hooks/useRecommendPlants";
import { CatalogFilters, CatalogPlant as FilterCatalogPlant } from "@/utils/catalogFilters";
import { getFilteredCatalog } from "@/utils/catalogFilters";
import RecommendationCard from "./RecommendationCard";

interface AIRecommendPanelProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogPlant[];
  activeFilters?: CatalogFilters;
}

// Helper to normalize filter values
const normalizeArrayFilter = (value: string | string[] | undefined): string[] | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
};

const AIRecommendPanel = ({
  isOpen,
  onClose,
  catalog,
  activeFilters,
}: AIRecommendPanelProps) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const { mutate: recommend, isPending, data: result, reset } = useRecommendPlants();

  // Pre-filter catalog with active filters
  const preFilteredCatalog = useMemo(() => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) {
      return catalog;
    }
    // Cast catalog to FilterCatalogPlant for getFilteredCatalog compatibility
    const filterCompatibleCatalog = catalog as unknown as FilterCatalogPlant[];
    const filtered = getFilteredCatalog(filterCompatibleCatalog, activeFilters);
    return filtered as unknown as CatalogPlant[];
  }, [catalog, activeFilters]);

  // Convert CatalogFilters to RecommendFilters
  const convertFilters = (filters?: CatalogFilters): RecommendFilters | undefined => {
    if (!filters) return undefined;
    return {
      exposure: normalizeArrayFilter(filters.exposure),
      water: filters.water,
      humidity: filters.humidity,
      climate_zones: normalizeArrayFilter(filters.climate_zones),
      min_temp_c: filters.min_temp_c,
      plant_type: normalizeArrayFilter(filters.plant_type),
      difficulty: filters.difficulty,
      growth_rate: filters.growth_rate,
      plant_use: normalizeArrayFilter(filters.plant_use),
      rarity: filters.rarity,
      price_max: filters.price_max,
      is_in_stock: filters.is_in_stock,
    };
  };

  const handleRecommend = () => {
    if (!prompt.trim() && !activeFilters) return;

    recommend({
      user_prompt: prompt.trim() || undefined,
      filters: convertFilters(activeFilters),
      catalog_subset: preFilteredCatalog,
    });
  };

  const handleClear = () => {
    setPrompt("");
    reset();
  };

  // Get active filter chips for display
  const activeFilterChips = useMemo(() => {
    if (!activeFilters) return [];
    const chips: string[] = [];
    
    const exposure = normalizeArrayFilter(activeFilters.exposure);
    if (exposure?.length) {
      chips.push(`Luz: ${exposure.join(", ")}`);
    }
    if (activeFilters.water) {
      chips.push(`Riego: ${activeFilters.water}`);
    }
    const climateZones = normalizeArrayFilter(activeFilters.climate_zones);
    if (climateZones?.length) {
      chips.push(`Zona: ${climateZones.join(", ")}`);
    }
    const plantUse = normalizeArrayFilter(activeFilters.plant_use);
    if (plantUse?.length) {
      chips.push(`Uso: ${plantUse.join(", ")}`);
    }
    if (activeFilters.difficulty) {
      chips.push(`Dificultad: ${activeFilters.difficulty}`);
    }
    const plantType = normalizeArrayFilter(activeFilters.plant_type);
    if (plantType?.length) {
      chips.push(`Tipo: ${plantType.join(", ")}`);
    }
    
    return chips;
  }, [activeFilters]);

  // Find plant data by ID
  const getPlantById = (plantId: string): CatalogPlant | undefined => {
    return catalog.find(p => p.id === plantId);
  };

  if (!isOpen) return null;

  return (
    <Card className="bg-gradient-to-br from-card via-card to-moss/5 border-moss/20 shadow-lg">
      <CardHeader className="pb-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 bg-moss/10 rounded-lg shrink-0">
              <Sparkles className="h-4 w-4 text-moss" />
            </div>
            <span>Recomendador IA</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Active filters as chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground">Filtros activos:</span>
            {activeFilterChips.map((chip, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-[10px] bg-moss/10 text-moss border-moss/20"
              >
                {chip}
              </Badge>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          De {preFilteredCatalog.length} plantas disponibles
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3 px-4 pt-0">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe lo que buscas... Ej: 'Busco una palmera resistente al frío para mi jardín en Madrid'"
            className="min-h-[80px] text-sm resize-none border-border/50 focus:border-moss focus:ring-moss/20"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleRecommend}
              disabled={isPending || (!prompt.trim() && !activeFilters)}
              className="flex-1 h-10 text-sm bg-moss hover:bg-moss/90 text-moss-foreground gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Recomendar</span>
                </>
              )}
            </Button>
            
            {(prompt || result) && (
              <Button 
                variant="outline" 
                onClick={handleClear} 
                className="h-10 px-4 text-sm border-border shrink-0"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Confidence indicator */}
            <div className="flex items-center gap-2">
              {result.no_good_match ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sin coincidencias óptimas
                </Badge>
              ) : (
                <Badge 
                  variant="outline" 
                  className={`
                    ${result.confidence === 'high' ? 'bg-moss/10 text-moss border-moss/30' : ''}
                    ${result.confidence === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                    ${result.confidence === 'low' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                  `}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Confianza: {result.confidence}
                </Badge>
              )}
            </div>

            {/* Recommendation Cards */}
            {result.recommendations.length > 0 ? (
              <div className="space-y-3">
                {result.recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={rec.plant_id}
                    recommendation={rec}
                    plant={getPlantById(rec.plant_id)}
                    rank={index + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/30 rounded-lg">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No encontramos plantas que coincidan perfectamente con tus criterios.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Intenta ajustar los filtros o ser más flexible en tu búsqueda.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecommendPanel;
