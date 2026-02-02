import { useState, useMemo, useCallback } from "react";
import { Plant } from "@/data/plants";
import { calculateViability, analyzePostalCodeClimate } from "@/utils/viabilityCalculator";

// Constants
const MIN_VIABILITY_SCORE = 4;

// Query patterns for semantic search
const QUERY_PATTERNS = {
  location: /(clima|localización|madrid|barcelona|valencia|sevilla|santander|cantabria|asturias|galicia|bilbao|canarias|baleares|london|paris|miami|florida|california)/,
  care: /(agua|riego|cobertura|sombra|cuidado|necesita)/,
  type: /(palmera|helecho|magnolia|tropical|árbol|planta)/
};

// Location to climate conditions mapping
const LOCATION_MAPPING: Record<string, string[]> = {
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

// Care terms mapping
const CARE_MAPPING: Record<string, string[]> = {
  'agua': ['riego', 'húmedo', 'humedad'],
  'riego': ['agua', 'húmedo', 'sequía'],
  'sombra': ['sombreada', 'semisombra', 'filtrada', 'protección'],
  'sol': ['soleada', 'directo', 'pleno']
};

// Synonyms for search expansion
const SYNONYMS: Record<string, string[]> = {
  'sol': ['soleada', 'luz', 'directo', 'pleno'],
  'sombra': ['sombreada', 'semisombra', 'filtrada'],
  'palmera': ['palm', 'arecaceae', 'rhopalostylis', 'brahea', 'sabal'],
  'helecho': ['fern', 'cyathea', 'dicksonia', 'arborescente'],
  'tropical': ['baleares', 'cálido', 'exótico'],
  'frío': ['cantabria', 'resistente', 'heladas']
};

export type ClimateInfo = ReturnType<typeof analyzePostalCodeClimate>;

interface UseAISearchResult {
  filteredPlants: Plant[];
  detectedPostalCode: string;
  climateInfo: ClimateInfo | null;
  sortedByViability: Array<{ plant: Plant; viability: ReturnType<typeof calculateViability> }>;
}

// Helper to detect postal codes in query
const detectPostalCode = (query: string): string => {
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
};

// Helper to get plant types from name
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

// Main AI search function
const performAISearch = (
  query: string, 
  plants: Plant[], 
  postalCode: string,
  climate: ClimateInfo | null
): Plant[] => {
  if (!query.trim()) return plants;

  const lowerQuery = query.toLowerCase();
  
  // If postal code detected, filter by viability
  if (postalCode && climate) {
    return plants.filter(plant => {
      const viability = calculateViability(plant, query, climate);
      return viability.totalScore >= MIN_VIABILITY_SCORE;
    });
  }
  
  const isLocationQuery = QUERY_PATTERNS.location.test(lowerQuery);
  const isCareQuery = QUERY_PATTERNS.care.test(lowerQuery);
  const isTypeQuery = QUERY_PATTERNS.type.test(lowerQuery);

  return plants.filter(plant => {
    const searchableText = [
      plant.name, plant.commonName, plant.variety,
      plant.description, plant.location, plant.light,
      plant.growthRate, plant.notes
    ].join(' ').toLowerCase();

    const plantTypes = getPlantTypes(plant.name);

    // Type-based matching
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

    // Location-based matching
    if (isLocationQuery) {
      for (const [location, conditions] of Object.entries(LOCATION_MAPPING)) {
        if (lowerQuery.includes(location)) {
          return conditions.some(c => searchableText.includes(c));
        }
      }
    }

    // Care-based matching
    if (isCareQuery) {
      for (const [care, terms] of Object.entries(CARE_MAPPING)) {
        if (lowerQuery.includes(care)) {
          return terms.some(term => searchableText.includes(term));
        }
      }
    }

    // Synonym-based matching
    return lowerQuery.split(' ').some(term => {
      if (searchableText.includes(term)) return true;
      for (const [key, values] of Object.entries(SYNONYMS)) {
        if (term.includes(key) && values.some(s => searchableText.includes(s))) return true;
      }
      return false;
    });
  });
};

export const useAISearch = (
  query: string,
  plants: Plant[],
  isEnabled: boolean
): UseAISearchResult => {
  // Detect postal code and climate from query
  const postalCode = useMemo(() => detectPostalCode(query), [query]);
  const climate = useMemo(() => 
    postalCode ? analyzePostalCodeClimate(postalCode) : null, 
    [postalCode]
  );

  // Perform AI search
  const filteredPlants = useMemo(() => {
    if (!query.trim()) return plants;
    
    if (isEnabled) {
      return performAISearch(query, plants, postalCode, climate);
    }
    
    // Basic search fallback
    return plants.filter(plant =>
      plant.name.toLowerCase().includes(query.toLowerCase()) ||
      plant.commonName.toLowerCase().includes(query.toLowerCase()) ||
      plant.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, plants, isEnabled, postalCode, climate]);

  // Sort by viability when AI mode is active
  const sortedByViability = useMemo(() => {
    if (!isEnabled || !query.trim() || !filteredPlants.length) return [];

    return filteredPlants
      .map(plant => ({
        plant,
        viability: calculateViability(plant, query, climate)
      }))
      .sort((a, b) => b.viability.totalScore - a.viability.totalScore);
  }, [filteredPlants, query, isEnabled, climate]);

  return {
    filteredPlants,
    detectedPostalCode: postalCode,
    climateInfo: climate,
    sortedByViability
  };
};

export const isCareQuery = (query: string): boolean => 
  QUERY_PATTERNS.care.test(query.toLowerCase());
