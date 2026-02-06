import { useState, useEffect, useCallback } from "react";
import { Sparkles, Filter } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Plant } from "@/data/plants";
import { buildSearchMessage, openWhatsAppShare } from "@/utils/whatsappShare";

const WhatsAppShareIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { useAISearch, isCareQuery } from "@/hooks/useAISearch";
import { 
  SearchInput, 
  ClimateInfoCard, 
  ViabilityAnalysisPanel, 
  SearchSuggestions,
  AISearchStatus 
} from "@/components/search";
import PlantFilters from "./PlantFilters";
import { AIRecommendPanel } from "./AIRecommend";
import { CatalogPlant } from "@/hooks/useRecommendPlants";

interface PlantSearchEngineProps {
  plants: Plant[];
  onFilteredPlantsChange: (filteredPlants: Plant[]) => void;
}

const PlantSearchEngine = ({ plants, onFilteredPlantsChange }: PlantSearchEngineProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [filteredByFilters, setFilteredByFilters] = useState<Plant[]>(plants);
  const [activeFilterSummary, setActiveFilterSummary] = useState<Record<string, string> | undefined>();
  const [activeSortKey, setActiveSortKey] = useState<string | undefined>();

  // Use custom AI search hook
  const { 
    filteredPlants, 
    detectedPostalCode, 
    climateInfo, 
    sortedByViability 
  } = useAISearch(searchQuery, filteredByFilters, isAIPanelOpen);

  // Derived state
  const hasActiveFilters = filteredByFilters.length !== plants.length;
  const showCareAnalysis = isAIPanelOpen && searchQuery.trim() && isCareQuery(searchQuery);

  // Notify parent of filtered plants
  useEffect(() => {
    onFilteredPlantsChange(filteredPlants);
  }, [filteredPlants, onFilteredPlantsChange]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleFilterChange = useCallback((filtered: Plant[], sortKey?: string, filterSummary?: Record<string, string>) => {
    setFilteredByFilters(filtered);
    setActiveSortKey(sortKey || undefined);
    setActiveFilterSummary(filterSummary);
  }, []);

  const SORT_LABELS: Record<string, string> = {
    priceLow: 'Precio: menor a mayor',
    priceHigh: 'Precio: mayor a menor',
    nameAZ: 'Nombre A-Z',
    newest: 'Más recientes',
  };

  const handleShareSearch = useCallback(() => {
    const message = buildSearchMessage({
      query: searchQuery.trim() || undefined,
      filters: activeFilterSummary,
      sort: activeSortKey ? SORT_LABELS[activeSortKey] || activeSortKey : undefined,
      listingUrl: window.location.href,
      resultsCount: filteredPlants.length,
      firstResultName: filteredPlants[0]?.name,
    });
    openWhatsAppShare(message);
  }, [searchQuery, activeFilterSummary, activeSortKey, filteredPlants]);

  // Convert plants to catalog format for AI panel
  const catalogPlants: CatalogPlant[] = plants.map(p => ({
    id: p.id,
    name: p.name,
    scientific_name: p.commonName || null,
    plant_type: null,
    exposure: p.light ? [p.light] : null,
    growth_rate: p.growthRate || null,
    climate_zones: p.hardinessZones || null,
    min_temp_c: null,
    water: p.waterNeeds?.toLowerCase() === 'alta' ? 'high' : 
           p.waterNeeds?.toLowerCase() === 'baja' ? 'low' : 'medium',
    humidity: null,
    plant_use: p.location ? [p.location] : null,
    rarity: null,
    difficulty: null,
    is_in_stock: (p.quantity || 0) > 0,
    price: p.price,
    thumbnail_url: p.images?.[0] || null,
  }));

  return (
    <div className="mb-6 sm:mb-8 space-y-4">
      {/* Search Card */}
      <Card className="bg-card/90 backdrop-blur-sm border-border shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              onClear={clearSearch}
              placeholder={isAIPanelOpen ? t('filters.searchAI') : t('filters.search')}
              showPostalCodeIndicator={!!detectedPostalCode}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 sm:pb-0 sm:mb-0">
              {/* Filters Button */}
              <Button
                variant={isFiltersVisible ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className={`shrink-0 h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 ${
                  isFiltersVisible 
                    ? "bg-moss hover:bg-moss/90 text-moss-foreground" 
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t('filters.title')}</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </Button>

              {/* WhatsApp Share Search Button */}
              {(searchQuery.trim() || hasActiveFilters) && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareSearch}
                      className="shrink-0 h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 border-border bg-background hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30"
                    >
                      <WhatsAppShareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{t('share.shareSearch', 'Compartir búsqueda')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('share.shareSearchTooltip', 'Compartir esta búsqueda por WhatsApp')}</TooltipContent>
                </Tooltip>
              )}
              {/* AI Recommender Button */}
              <Button
                variant={isAIPanelOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`shrink-0 h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 ${
                  isAIPanelOpen 
                    ? "bg-moss hover:bg-moss/90 text-moss-foreground" 
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Recomendador IA</span>
                <span className="sm:hidden">IA</span>
              </Button>
            </div>
          </div>

          {/* AI Mode Info */}
          {isAIPanelOpen && searchQuery.trim() && (
            <div className="mt-4 space-y-3">
              <AISearchStatus 
                resultsCount={filteredPlants.length} 
                postalCode={detectedPostalCode || undefined} 
              />
              
              {climateInfo && (
                <ClimateInfoCard 
                  climateInfo={climateInfo} 
                  postalCode={detectedPostalCode} 
                />
              )}
              
              <SearchSuggestions 
                currentQuery={searchQuery} 
                onSelect={handleSearch} 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Panel */}
      <PlantFilters 
        plants={plants} 
        onFilterChange={handleFilterChange}
        isVisible={isFiltersVisible}
      />

      {/* AI Recommend Panel */}
      <AIRecommendPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        catalog={catalogPlants}
      />

      {/* Viability Analysis Panel */}
      {isAIPanelOpen && searchQuery.trim() && sortedByViability.length > 0 && (
        <ViabilityAnalysisPanel
          sortedPlants={sortedByViability}
          searchQuery={searchQuery}
          postalCode={detectedPostalCode || undefined}
          showCareAnalysis={showCareAnalysis}
        />
      )}
    </div>
  );
};

export default PlantSearchEngine;
