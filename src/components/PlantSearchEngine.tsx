import { useState, useEffect, useCallback } from "react";
import { Sparkles, Filter } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plant } from "@/data/plants";
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
        onFilterChange={setFilteredByFilters}
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
