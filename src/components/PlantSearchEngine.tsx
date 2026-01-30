import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Sparkles, Droplets, Sun, Filter, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plant } from "@/data/plants";
import { calculateViability, analyzePlantCare, analyzePostalCodeClimate } from "@/utils/viabilityCalculator";
import ViabilityScale from "./ViabilityScale";
import PlantFilters from "./PlantFilters";

interface PlantSearchEngineProps {
  plants: Plant[];
  onFilteredPlantsChange: (filteredPlants: Plant[]) => void;
}

const PlantSearchEngine = ({ plants, onFilteredPlantsChange }: PlantSearchEngineProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAIMode, setIsAIMode] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [showViabilityAnalysis, setShowViabilityAnalysis] = useState(false);
  const [showCareAnalysis, setShowCareAnalysis] = useState(false);
  const [viabilityResultsToShow, setViabilityResultsToShow] = useState(3);
  const [filteredByFilters, setFilteredByFilters] = useState<Plant[]>(plants);
  const [detectedPostalCode, setDetectedPostalCode] = useState<string>("");
  const [climateInfo, setClimateInfo] = useState<any>(null);

  // Detect postal code in search query
  const detectPostalCode = useCallback((query: string): string => {
    // Spanish postal codes: 5 digits (01000-52999)
    const spanishPostalMatch = query.match(/\b([0-4][0-9]{4}|5[0-2][0-9]{3})\b/);
    if (spanishPostalMatch) return spanishPostalMatch[1];
    
    // International formats
    const internationalMatches = [
      /\b([0-9]{5})\b/, // US ZIP codes
      /\b([A-Z][0-9][A-Z] ?[0-9][A-Z][0-9])\b/i, // Canadian postal codes
      /\b([A-Z]{1,2}[0-9]{1,2}[A-Z]? ?[0-9][A-Z]{2})\b/i // UK postcodes
    ];
    
    for (const regex of internationalMatches) {
      const match = query.match(regex);
      if (match) return match[1];
    }
    
    return "";
  }, []);

  // Enhanced AI search with postal code support
  const aiSearch = useCallback((query: string, plantsToSearch: Plant[]): Plant[] => {
    if (!query.trim()) return plantsToSearch;

    const lowerQuery = query.toLowerCase();
    const postalCode = detectPostalCode(query);
    
    // If postal code detected, analyze climate
    if (postalCode) {
      const climate = analyzePostalCodeClimate(postalCode);
      setDetectedPostalCode(postalCode);
      setClimateInfo(climate);
      
      // Filter plants based on climate compatibility
      return plantsToSearch.filter(plant => {
        const viability = calculateViability(plant, query, climate);
        return viability.totalScore >= 4; // Show plants with at least moderate viability
      });
    } else {
      setDetectedPostalCode("");
      setClimateInfo(null);
    }
    
    // Rest of existing AI search logic
    const isLocationQuery = lowerQuery.includes('clima') || lowerQuery.includes('localización') ||
                           /(madrid|barcelona|valencia|sevilla|santander|cantabria|asturias|galicia|bilbao|canarias|baleares|london|paris|miami|florida|california)/.test(lowerQuery);
    
    const isCareQuery = lowerQuery.includes('agua') || lowerQuery.includes('riego') ||
                       lowerQuery.includes('cobertura') || lowerQuery.includes('sombra') ||
                       lowerQuery.includes('cuidado') || lowerQuery.includes('necesita');
    
    const isTypeQuery = lowerQuery.includes('palmera') || lowerQuery.includes('helecho') ||
                       lowerQuery.includes('magnolia') || lowerQuery.includes('tropical') ||
                       lowerQuery.includes('árbol') || lowerQuery.includes('planta');

    return plantsToSearch.filter(plant => {
      const searchableText = [
        plant.name,
        plant.commonName,
        plant.variety,
        plant.description,
        plant.location,
        plant.light,
        plant.growthRate,
        plant.notes
      ].join(' ').toLowerCase();

      // Plant type classification for colloquial search
      const getPlantColloquialType = (plantName: string): string[] => {
        const name = plantName.toLowerCase();
        const types = [];
        
        if (name.includes('rhopalostylis') || name.includes('ptychosperma') || 
            name.includes('brahea') || name.includes('sabal') || 
            name.includes('chamaedorea') || name.includes('basselinia') ||
            name.includes('caryota')) {
          types.push('palmera', 'palma', 'tropical');
        }
        if (name.includes('cyathea') || name.includes('dicksonia')) {
          types.push('helecho', 'prehistórico', 'arborescente');
        }
        if (name.includes('magnolia')) {
          types.push('magnolia', 'árbol', 'flor');
        }
        if (name.includes('zamia')) {
          types.push('cícada', 'fósil', 'prehistórico');
        }
        
        return types;
      };

      const plantTypes = getPlantColloquialType(plant.name);

      // Type-based search
      if (isTypeQuery) {
        const typeMatches = [
          lowerQuery.includes('palmera') && plantTypes.includes('palmera'),
          lowerQuery.includes('helecho') && plantTypes.includes('helecho'),
          lowerQuery.includes('magnolia') && plantTypes.includes('magnolia'),
          lowerQuery.includes('tropical') && plantTypes.includes('tropical'),
          lowerQuery.includes('árbol') && (plantTypes.includes('árbol') || plantTypes.includes('arborescente')),
          lowerQuery.includes('prehistórico') && plantTypes.includes('prehistórico')
        ];
        
        if (typeMatches.some(match => match)) return true;
      }

      // Location/climate-based search with enhanced mapping
      if (isLocationQuery) {
        const locationMapping: { [key: string]: string[] } = {
          'madrid': ['cantabria', 'continental', 'seco', 'frío'],
          'barcelona': ['cantabria', 'mediterráneo', 'moderado'],
          'valencia': ['baleares', 'mediterráneo', 'cálido'],
          'sevilla': ['baleares', 'cálido', 'seco', 'intenso'],
          'santander': ['cantabria', 'atlántico', 'húmedo', 'fresco'],
          'cantabria': ['cantabria', 'frío', 'húmedo', 'resistente'],
          'asturias': ['cantabria', 'atlántico', 'húmedo'],
          'galicia': ['cantabria', 'atlántico', 'húmedo', 'fresco'],
          'canarias': ['baleares', 'subtropical', 'cálido'],
          'baleares': ['baleares', 'mediterráneo', 'insular'],
          'london': ['cantabria', 'frío', 'húmedo'],
          'paris': ['cantabria', 'templado'],
          'miami': ['baleares', 'tropical', 'húmedo'],
          'california': ['baleares', 'mediterráneo', 'seco']
        };

        for (const [location, conditions] of Object.entries(locationMapping)) {
          if (lowerQuery.includes(location)) {
            return conditions.some(condition => 
              plant.location.toLowerCase().includes(condition) ||
              plant.notes.toLowerCase().includes(condition) ||
              searchableText.includes(condition)
            );
          }
        }
      }

      // Care-based search
      if (isCareQuery) {
        const careMapping: { [key: string]: string[] } = {
          'agua': ['riego', 'húmedo', 'humedad'],
          'riego': ['agua', 'húmedo', 'sequía'],
          'sombra': ['sombreada', 'semisombra', 'filtrada', 'protección'],
          'sol': ['soleada', 'directo', 'pleno'],
          'cobertura': ['protección', 'malla', 'filtrada'],
          'resistente': ['frío', 'heladas', 'duro']
        };

        for (const [care, terms] of Object.entries(careMapping)) {
          if (lowerQuery.includes(care)) {
            return terms.some(term => 
              plant.light.toLowerCase().includes(term) ||
              plant.notes.toLowerCase().includes(term) ||
              searchableText.includes(term)
            );
          }
        }
      }

      // Enhanced general search with expanded synonyms
      const searchTerms = lowerQuery.split(' ');
      
      return searchTerms.some(term => {
        if (searchableText.includes(term)) return true;

        const synonyms: { [key: string]: string[] } = {
          'sol': ['soleada', 'luz', 'directo', 'pleno'],
          'sombra': ['sombreada', 'semisombra', 'filtrada', 'oscuro'],
          'palmera': ['palm', 'arecaceae', 'rhopalostylis', 'chuniophoenix', 'brahea', 'sabal', 'ptychosperma', 'caryota', 'chamaedorea', 'basselinia'],
          'helecho': ['fern', 'cyathea', 'dicksonia', 'arborescente', 'prehistórico'],
          'magnolia': ['magnolia', 'laevifolia', 'flor'],
          'tropical': ['baleares', 'cálido', 'exótico'],
          'frío': ['cantabria', 'resistente', 'heladas', 'duro'],
          'rápido': ['rápido', 'veloz', 'acelerado'],
          'lento': ['lento', 'pausado', 'gradual'],
          'grande': ['arborescente', 'gigante', 'alto'],
          'pequeño': ['compacta', 'pequeña', 'mini'],
          'azul': ['azul', 'blue', 'plateado', 'armata'],
          'agua': ['riego', 'húmedo', 'humedad'],
          'cuidado': ['mantenimiento', 'atención', 'necesita']
        };

        for (const [key, values] of Object.entries(synonyms)) {
          if (term.includes(key) && values.some(synonym => searchableText.includes(synonym))) {
            return true;
          }
        }

        return false;
      });
    });
  }, [detectPostalCode]);

  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return filteredByFilters;
    
    if (isAIMode) {
      return aiSearch(searchQuery, filteredByFilters);
    } else {
      return filteredByFilters.filter(plant =>
        plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [searchQuery, filteredByFilters, isAIMode, aiSearch]);

  // Calculate and sort plants by viability when in AI mode and have search query
  const sortedPlantsByViability = useMemo(() => {
    if (!isAIMode || !searchQuery.trim() || filteredPlants.length === 0) {
      return [];
    }

    const plantsWithViability = filteredPlants.map(plant => ({
      plant,
      viability: calculateViability(plant, searchQuery, climateInfo)
    }));

    // Sort by total score (highest to lowest)
    return plantsWithViability.sort((a, b) => b.viability.totalScore - a.viability.totalScore);
  }, [filteredPlants, searchQuery, isAIMode, climateInfo]);

  useEffect(() => {
    console.log('Updating filtered plants:', filteredPlants.length);
    onFilteredPlantsChange(filteredPlants);
    setViabilityResultsToShow(3);
  }, [filteredPlants, onFilteredPlantsChange]);

  const handleFilterChange = (newFilteredPlants: Plant[]) => {
    setFilteredByFilters(newFilteredPlants);
  };

  const handleSearch = (value: string) => {
    console.log('Search query changed:', value);
    setSearchQuery(value);
    const shouldShowAnalysis = value.trim().length > 0 && isAIMode;
    setShowViabilityAnalysis(shouldShowAnalysis);
    
    const lowerValue = value.toLowerCase();
    const isCareQuery = lowerValue.includes('agua') || lowerValue.includes('riego') ||
                       lowerValue.includes('cobertura') || lowerValue.includes('sombra') ||
                       lowerValue.includes('cuidado') || lowerValue.includes('necesita');
    setShowCareAnalysis(shouldShowAnalysis && isCareQuery);
    
    setViabilityResultsToShow(3);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowViabilityAnalysis(false);
    setShowCareAnalysis(false);
    setViabilityResultsToShow(3);
    setDetectedPostalCode("");
    setClimateInfo(null);
  };

  const handleShowMoreResults = () => {
    setViabilityResultsToShow(prev => prev + 3);
  };

  const getSuggestions = () => {
    if (!isAIMode || !searchQuery.trim()) return [];
    
    const suggestions = [
      "plantas para código postal 28001",
      "palmeras resistentes al frío Madrid",
      "helechos que necesitan poca luz",
      "plantas para Barcelona clima mediterráneo",
      "código postal 46001 plantas",
      "plantas tropicales para Sevilla"
    ];
    
    return suggestions.filter(s => 
      !s.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3);
  };

  const hasActiveFilters = filteredByFilters.length !== plants.length;

  return (
    <div className="mb-6 sm:mb-8">
      <Card className="bg-white/80 backdrop-blur-sm border-green-200">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={isAIMode ? "Ej: plantas para código postal 28987, palmeras para Madrid, plantas que necesitan poca agua..." : "Buscar plantas..."}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 border-green-200 focus:border-green-400"
                />
                {detectedPostalCode && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isFiltersVisible ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                  className={isFiltersVisible ? "bg-green-600 hover:bg-green-700" : "border-green-200 hover:bg-green-50"}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                      1
                    </span>
                  )}
                </Button>
                <Button
                  variant={isAIMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAIMode(!isAIMode)}
                  className={isAIMode ? "bg-green-600 hover:bg-green-700" : "border-green-200 hover:bg-green-50"}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  IA
                </Button>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSearch}
                    className="border-green-200 hover:bg-green-50"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {isAIMode && searchQuery.trim() && (
              <div className="space-y-2">
                <p className="text-sm text-green-700 font-medium">
                  🤖 Búsqueda inteligente activada - {filteredPlants.length} plantas encontradas
                  {detectedPostalCode && (
                    <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                      <MapPin className="h-3 w-3" />
                      CP: {detectedPostalCode}
                    </span>
                  )}
                </p>
                {climateInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Análisis Climático - CP {detectedPostalCode}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-blue-700">
                      <div>🌡️ <strong>Zona:</strong> {climateInfo.zone}</div>
                      <div>❄️ <strong>Rusticidad:</strong> {climateInfo.hardiness}</div>
                      <div>💧 <strong>Humedad:</strong> {climateInfo.humidity}</div>
                      <div>☀️ <strong>Sol:</strong> {climateInfo.sunIntensity}</div>
                    </div>
                  </div>
                )}
                {getSuggestions().length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600">Prueba estos códigos postales:</span>
                    {getSuggestions().map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(suggestion)}
                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PlantFilters 
        plants={plants} 
        onFilterChange={handleFilterChange}
        isVisible={isFiltersVisible}
      />

      {/* Enhanced Analysis Section */}
      {isAIMode && searchQuery.trim() && sortedPlantsByViability.length > 0 && (
        <div className="mt-4 space-y-4">
          {showViabilityAnalysis && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                📊 Análisis de Viabilidad 
                {detectedPostalCode && (
                  <span className="text-base font-normal text-blue-600">
                    para CP {detectedPostalCode}
                  </span>
                )}
                <span className="text-base font-normal text-gray-600"> (Ordenado por Mayor Viabilidad)</span>
              </h3>
              <div className="text-sm text-green-700 mb-3">
                Mostrando {Math.min(viabilityResultsToShow, sortedPlantsByViability.length)} de {sortedPlantsByViability.length} plantas ordenadas por viabilidad
              </div>
              {sortedPlantsByViability.slice(0, viabilityResultsToShow).map(({ plant, viability }, index) => (
                <ViabilityScale 
                  key={`${plant.id}-${searchQuery}`}
                  viability={viability} 
                  plantName={plant.name}
                />
              ))}
              
              {/* Show More Results Button */}
              {viabilityResultsToShow < sortedPlantsByViability.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={handleShowMoreResults}
                    className="border-green-200 hover:bg-green-50"
                  >
                    Ver Más Resultados ({Math.min(3, sortedPlantsByViability.length - viabilityResultsToShow)} siguientes)
                  </Button>
                </div>
              )}
            </>
          )}

          {showCareAnalysis && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                💡 Consejos de Cuidado
              </h3>
              {sortedPlantsByViability.slice(0, Math.min(viabilityResultsToShow, 3)).map(({ plant }) => {
                const care = analyzePlantCare(plant, searchQuery);
                return (
                  <Card key={`care-${plant.id}-${searchQuery}`} className="bg-blue-50/80 backdrop-blur-sm border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">{plant.name}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Droplets className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Agua:</span> {care.waterNeeds}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Sun className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Cobertura:</span> {care.coverageNeeds}
                          </div>
                        </div>
                        {care.careAdvice && (
                          <div className="bg-white/60 p-2 rounded text-xs text-gray-700">
                            <span className="font-medium">Consejo:</span> {care.careAdvice}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PlantSearchEngine;
