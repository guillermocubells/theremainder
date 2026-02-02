import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Sparkles, Droplets, Sun, Filter, MapPin, X, Bot } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plant } from "@/data/plants";
import { calculateViability, analyzePlantCare, analyzePostalCodeClimate } from "@/utils/viabilityCalculator";
import ViabilityScale from "./ViabilityScale";
import PlantFilters from "./PlantFilters";
import { AIRecommendPanel } from "./AIRecommend";
import { CatalogPlant } from "@/hooks/useRecommendPlants";

interface PlantSearchEngineProps {
  plants: Plant[];
  onFilteredPlantsChange: (filteredPlants: Plant[]) => void;
}

// Constants
const RESULTS_INCREMENT = 3;
const MIN_VIABILITY_SCORE = 4;

const SEARCH_SUGGESTIONS = [
  "plantas para código postal 28001",
  "palmeras resistentes al frío Madrid",
  "helechos que necesitan poca luz",
  "plantas para Barcelona clima mediterráneo",
  "código postal 46001 plantas",
  "plantas tropicales para Sevilla"
];

const PlantSearchEngine = ({ plants, onFilteredPlantsChange }: PlantSearchEngineProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAIMode, setIsAIMode] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [showViabilityAnalysis, setShowViabilityAnalysis] = useState(false);
  const [showCareAnalysis, setShowCareAnalysis] = useState(false);
  const [viabilityResultsToShow, setViabilityResultsToShow] = useState(RESULTS_INCREMENT);
  const [filteredByFilters, setFilteredByFilters] = useState<Plant[]>(plants);
  const [detectedPostalCode, setDetectedPostalCode] = useState<string>("");
  const [climateInfo, setClimateInfo] = useState<ReturnType<typeof analyzePostalCodeClimate> | null>(null);

  // Detect postal code in search query
  const detectPostalCode = useCallback((query: string): string => {
    const patterns = [
      /\b([0-4][0-9]{4}|5[0-2][0-9]{3})\b/, // Spanish
      /\b([0-9]{5})\b/, // US ZIP
      /\b([A-Z][0-9][A-Z] ?[0-9][A-Z][0-9])\b/i, // Canadian
      /\b([A-Z]{1,2}[0-9]{1,2}[A-Z]? ?[0-9][A-Z]{2})\b/i // UK
    ];
    
    for (const regex of patterns) {
      const match = query.match(regex);
      if (match) return match[1];
    }
    return "";
  }, []);

  // AI search logic
  const aiSearch = useCallback((query: string, plantsToSearch: Plant[]): Plant[] => {
    if (!query.trim()) return plantsToSearch;

    const lowerQuery = query.toLowerCase();
    const postalCode = detectPostalCode(query);
    
    if (postalCode) {
      const climate = analyzePostalCodeClimate(postalCode);
      setDetectedPostalCode(postalCode);
      setClimateInfo(climate);
      
      return plantsToSearch.filter(plant => {
        const viability = calculateViability(plant, query, climate);
        return viability.totalScore >= MIN_VIABILITY_SCORE;
      });
    } else {
      setDetectedPostalCode("");
      setClimateInfo(null);
    }
    
    const queryPatterns = {
      location: /(clima|localización|madrid|barcelona|valencia|sevilla|santander|cantabria|asturias|galicia|bilbao|canarias|baleares|london|paris|miami|florida|california)/,
      care: /(agua|riego|cobertura|sombra|cuidado|necesita)/,
      type: /(palmera|helecho|magnolia|tropical|árbol|planta)/
    };

    const isLocationQuery = queryPatterns.location.test(lowerQuery);
    const isCareQuery = queryPatterns.care.test(lowerQuery);
    const isTypeQuery = queryPatterns.type.test(lowerQuery);

    return plantsToSearch.filter(plant => {
      const searchableText = [
        plant.name, plant.commonName, plant.variety,
        plant.description, plant.location, plant.light,
        plant.growthRate, plant.notes
      ].join(' ').toLowerCase();

      const getPlantTypes = (name: string): string[] => {
        const n = name.toLowerCase();
        const types: string[] = [];
        
        if (/(rhopalostylis|ptychosperma|brahea|sabal|chamaedorea|basselinia|caryota)/.test(n)) {
          types.push('palmera', 'palma', 'tropical');
        }
        if (/(cyathea|dicksonia)/.test(n)) {
          types.push('helecho', 'prehistórico', 'arborescente');
        }
        if (/magnolia/.test(n)) types.push('magnolia', 'árbol', 'flor');
        if (/zamia/.test(n)) types.push('cícada', 'fósil', 'prehistórico');
        
        return types;
      };

      const plantTypes = getPlantTypes(plant.name);

      if (isTypeQuery) {
        const typeMatches = [
          lowerQuery.includes('palmera') && plantTypes.includes('palmera'),
          lowerQuery.includes('helecho') && plantTypes.includes('helecho'),
          lowerQuery.includes('magnolia') && plantTypes.includes('magnolia'),
          lowerQuery.includes('tropical') && plantTypes.includes('tropical'),
          lowerQuery.includes('árbol') && (plantTypes.includes('árbol') || plantTypes.includes('arborescente'))
        ];
        if (typeMatches.some(Boolean)) return true;
      }

      if (isLocationQuery) {
        const locationMapping: Record<string, string[]> = {
          'madrid': ['cantabria', 'continental', 'seco', 'frío'],
          'barcelona': ['cantabria', 'mediterráneo', 'moderado'],
          'valencia': ['baleares', 'mediterráneo', 'cálido'],
          'sevilla': ['baleares', 'cálido', 'seco', 'intenso'],
          'santander': ['cantabria', 'atlántico', 'húmedo', 'fresco'],
          'cantabria': ['cantabria', 'frío', 'húmedo', 'resistente'],
          'asturias': ['cantabria', 'atlántico', 'húmedo'],
          'galicia': ['cantabria', 'atlántico', 'húmedo', 'fresco'],
          'canarias': ['baleares', 'subtropical', 'cálido'],
          'baleares': ['baleares', 'mediterráneo', 'insular']
        };

        for (const [location, conditions] of Object.entries(locationMapping)) {
          if (lowerQuery.includes(location)) {
            return conditions.some(c => searchableText.includes(c));
          }
        }
      }

      if (isCareQuery) {
        const careMapping: Record<string, string[]> = {
          'agua': ['riego', 'húmedo', 'humedad'],
          'riego': ['agua', 'húmedo', 'sequía'],
          'sombra': ['sombreada', 'semisombra', 'filtrada', 'protección'],
          'sol': ['soleada', 'directo', 'pleno']
        };

        for (const [care, terms] of Object.entries(careMapping)) {
          if (lowerQuery.includes(care)) {
            return terms.some(term => searchableText.includes(term));
          }
        }
      }

      const synonyms: Record<string, string[]> = {
        'sol': ['soleada', 'luz', 'directo', 'pleno'],
        'sombra': ['sombreada', 'semisombra', 'filtrada'],
        'palmera': ['palm', 'arecaceae', 'rhopalostylis', 'brahea', 'sabal'],
        'helecho': ['fern', 'cyathea', 'dicksonia', 'arborescente'],
        'tropical': ['baleares', 'cálido', 'exótico'],
        'frío': ['cantabria', 'resistente', 'heladas']
      };

      return lowerQuery.split(' ').some(term => {
        if (searchableText.includes(term)) return true;
        for (const [key, values] of Object.entries(synonyms)) {
          if (term.includes(key) && values.some(s => searchableText.includes(s))) return true;
        }
        return false;
      });
    });
  }, [detectPostalCode]);

  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return filteredByFilters;
    
    return isAIMode
      ? aiSearch(searchQuery, filteredByFilters)
      : filteredByFilters.filter(plant =>
          plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plant.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plant.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
  }, [searchQuery, filteredByFilters, isAIMode, aiSearch]);

  const sortedPlantsByViability = useMemo(() => {
    if (!isAIMode || !searchQuery.trim() || !filteredPlants.length) return [];

    return filteredPlants
      .map(plant => ({
        plant,
        viability: calculateViability(plant, searchQuery, climateInfo)
      }))
      .sort((a, b) => b.viability.totalScore - a.viability.totalScore);
  }, [filteredPlants, searchQuery, isAIMode, climateInfo]);

  useEffect(() => {
    onFilteredPlantsChange(filteredPlants);
    setViabilityResultsToShow(RESULTS_INCREMENT);
  }, [filteredPlants, onFilteredPlantsChange]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    const shouldShowAnalysis = value.trim().length > 0 && isAIMode;
    setShowViabilityAnalysis(shouldShowAnalysis);
    
    const isCareQuery = /(agua|riego|cobertura|sombra|cuidado|necesita)/.test(value.toLowerCase());
    setShowCareAnalysis(shouldShowAnalysis && isCareQuery);
    setViabilityResultsToShow(RESULTS_INCREMENT);
  }, [isAIMode]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setShowViabilityAnalysis(false);
    setShowCareAnalysis(false);
    setViabilityResultsToShow(RESULTS_INCREMENT);
    setDetectedPostalCode("");
    setClimateInfo(null);
  }, []);

  const suggestions = useMemo(() => {
    if (!isAIMode || !searchQuery.trim()) return [];
    return SEARCH_SUGGESTIONS
      .filter(s => !s.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3);
  }, [isAIMode, searchQuery]);

  const hasActiveFilters = filteredByFilters.length !== plants.length;

  return (
    <div className="mb-6 sm:mb-8 space-y-4">
      {/* Search Card */}
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={isAIMode ? t('filters.searchAI') : t('filters.search')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 h-10 border-gray-200 focus:border-green-400 focus:ring-green-400/20"
              />
              {detectedPostalCode && (
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
              {searchQuery && !detectedPostalCode && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action Buttons - Stack en mobile, row en desktop */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={isFiltersVisible ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className={`flex-1 sm:flex-initial h-11 sm:h-10 text-sm ${isFiltersVisible 
                  ? "bg-moss hover:bg-moss/90 text-moss-foreground" 
                  : "border-border hover:bg-muted"}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                <span>{t('filters.title')}</span>
                {hasActiveFilters && (
                  <span className="ml-1.5 bg-background/20 text-xs px-1.5 py-0.5 rounded-full">•</span>
                )}
              </Button>
              
              <Button
                variant={isAIMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAIMode(!isAIMode)}
                className={`h-11 sm:h-10 px-4 ${isAIMode 
                  ? "bg-moss hover:bg-moss/90 text-moss-foreground" 
                  : "border-border hover:bg-muted"}`}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                <span>IA</span>
              </Button>

              {/* AI Recommender Button */}
              <Button
                variant={isAIPanelOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`flex-1 sm:flex-initial h-11 sm:h-10 text-sm whitespace-nowrap ${isAIPanelOpen 
                  ? "bg-primary hover:bg-primary/90" 
                  : "border-border hover:bg-muted"}`}
              >
                <Bot className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Recomendador</span>
                <span className="xs:hidden">Rec. IA</span>
              </Button>
            </div>
          </div>

          {/* AI Mode Info */}
          {isAIMode && searchQuery.trim() && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">{t('filters.aiSearchActive')}</span>
                <span className="text-gray-500">— {filteredPlants.length} {t('filters.plantsFound')}</span>
                {detectedPostalCode && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <MapPin className="h-3 w-3" />
                    {t('filters.postalCode')}: {detectedPostalCode}
                  </span>
                )}
              </div>

              {/* Climate Info */}
              {climateInfo && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 text-sm mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('filters.climateAnalysis')} — {t('filters.postalCode')} {detectedPostalCode}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-blue-700">
                    <div>🌡️ <span className="font-medium">{t('filters.zone')}:</span> {climateInfo.zone}</div>
                    <div>❄️ <span className="font-medium">{t('filters.hardiness')}:</span> {climateInfo.hardiness}</div>
                    <div>💧 <span className="font-medium">{t('filters.humidity')}:</span> {climateInfo.humidity}</div>
                    <div>☀️ <span className="font-medium">{t('filters.sun')}:</span> {climateInfo.sunIntensity}</div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">{t('filters.trySuggestions')}:</span>
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(suggestion)}
                      className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
        catalog={plants.map(p => ({
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
        } as CatalogPlant))}
      />

      {/* Viability Analysis */}
      {isAIMode && searchQuery.trim() && sortedPlantsByViability.length > 0 && (
        <div className="space-y-4">
          {showViabilityAnalysis && (
            <Card className="bg-white/90 backdrop-blur-sm border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    📊 {t('filters.viabilityAnalysis')}
                    {detectedPostalCode && (
                      <span className="text-sm font-normal text-blue-600">
                        {t('filters.postalCode')} {detectedPostalCode}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-500">{t('filters.sortedByViability')}</span>
                </div>
                
                <p className="text-xs text-gray-600 mb-4">
                  {t('filters.showingResults', { 
                    shown: Math.min(viabilityResultsToShow, sortedPlantsByViability.length), 
                    total: sortedPlantsByViability.length 
                  })}
                </p>

                <div className="space-y-3">
                  {sortedPlantsByViability.slice(0, viabilityResultsToShow).map(({ plant, viability }) => (
                    <ViabilityScale 
                      key={`${plant.id}-${searchQuery}`}
                      viability={viability} 
                      plantName={plant.name}
                    />
                  ))}
                </div>

                {viabilityResultsToShow < sortedPlantsByViability.length && (
                  <div className="text-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViabilityResultsToShow(prev => prev + RESULTS_INCREMENT)}
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      {t('filters.showMore')} ({Math.min(RESULTS_INCREMENT, sortedPlantsByViability.length - viabilityResultsToShow)})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Care Analysis */}
          {showCareAnalysis && (
            <Card className="bg-white/90 backdrop-blur-sm border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  💡 {t('filters.careTips')}
                </h3>
                
                <div className="space-y-3">
                  {sortedPlantsByViability.slice(0, Math.min(viabilityResultsToShow, 3)).map(({ plant }) => {
                    const care = analyzePlantCare(plant, searchQuery);
                    return (
                      <div key={`care-${plant.id}`} className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-800 mb-2 text-sm">{plant.name}</h4>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start gap-2">
                            <Droplets className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span><span className="font-medium">{t('filters.water')}:</span> {care.waterNeeds}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Sun className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span><span className="font-medium">{t('filters.coverage')}:</span> {care.coverageNeeds}</span>
                          </div>
                          {care.careAdvice && (
                            <div className="bg-white/60 p-2 rounded text-gray-700 mt-2">
                              <span className="font-medium">{t('filters.tip')}:</span> {care.careAdvice}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PlantSearchEngine;
