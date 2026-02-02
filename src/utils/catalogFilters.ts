/**
 * Generic catalog pre-filter utility
 * Filters plants based on user preferences without AI
 */

export interface CatalogFilters {
  // Habitat & Adaptation filters
  exposure?: string | string[];
  water?: 'low' | 'medium' | 'high';
  humidity?: 'low' | 'medium' | 'high';
  climate_zones?: string | string[];
  min_temp_c?: number;
  
  // Commercial Selection filters
  plant_type?: string | string[];
  rarity?: 'low' | 'medium' | 'high';
  difficulty?: 'easy' | 'intermediate' | 'advanced';
  growth_rate?: 'slow' | 'medium' | 'fast';
  is_in_stock?: boolean;
  plant_use?: string | string[];
  
  // Price range
  price_min?: number;
  price_max?: number;
  
  // Search
  search?: string;
}

export interface CatalogPlant {
  id: string;
  name: string;
  common_name?: string | null;
  scientific_name?: string | null;
  plant_type?: string | null;
  exposure?: string[] | null;
  growth_rate?: string | null;
  climate_zones?: string[] | null;
  min_temp_c?: number | null;
  water?: string | null;
  humidity?: string | null;
  plant_use?: string[] | null;
  rarity?: string | null;
  difficulty?: string | null;
  is_in_stock?: boolean | null;
  stock_qty?: number | null;
  price?: number | null;
  notes?: string | null;
  [key: string]: unknown;
}

/**
 * Checks if a plant matches an array-based filter
 * Supports both single value and array of values for the filter
 */
const matchesArrayFilter = (
  plantValues: string[] | null | undefined,
  filterValue: string | string[] | undefined
): boolean => {
  if (!filterValue) return true;
  if (!plantValues || plantValues.length === 0) return false;
  
  const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
  return filterArray.some(f => plantValues.includes(f));
};

/**
 * Checks if a plant matches an enum-based filter
 */
const matchesEnumFilter = (
  plantValue: string | null | undefined,
  filterValue: string | string[] | undefined
): boolean => {
  if (!filterValue) return true;
  if (!plantValue) return false;
  
  const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
  return filterArray.includes(plantValue);
};

/**
 * Checks if a plant matches a boolean filter
 */
const matchesBooleanFilter = (
  plantValue: boolean | null | undefined,
  filterValue: boolean | undefined
): boolean => {
  if (filterValue === undefined) return true;
  return plantValue === filterValue;
};

/**
 * Checks if a plant matches a numeric range filter
 */
const matchesNumericRange = (
  plantValue: number | null | undefined,
  min?: number,
  max?: number
): boolean => {
  if (min === undefined && max === undefined) return true;
  if (plantValue === null || plantValue === undefined) return false;
  
  if (min !== undefined && plantValue < min) return false;
  if (max !== undefined && plantValue > max) return false;
  return true;
};

/**
 * Checks if a plant matches a minimum temperature filter
 * Plant is compatible if its min_temp_c is <= user's zone temperature
 */
const matchesTemperatureFilter = (
  plantMinTemp: number | null | undefined,
  userMinTemp: number | undefined
): boolean => {
  if (userMinTemp === undefined) return true;
  if (plantMinTemp === null || plantMinTemp === undefined) return true;
  return plantMinTemp <= userMinTemp;
};

/**
 * Checks if a plant matches a search query
 */
const matchesSearch = (
  plant: CatalogPlant,
  search: string | undefined
): boolean => {
  if (!search || search.trim() === '') return true;
  
  const query = search.toLowerCase().trim();
  const searchableFields = [
    plant.name,
    plant.common_name,
    plant.scientific_name,
    plant.notes,
  ].filter(Boolean) as string[];
  
  return searchableFields.some(field => 
    field.toLowerCase().includes(query)
  );
};

/**
 * Main filter function - filters catalog based on user preferences
 * All filters are optional and combined with AND logic
 */
export function getFilteredCatalog<T extends CatalogPlant>(
  catalog: T[],
  filters: CatalogFilters
): T[] {
  return catalog.filter(plant => {
    // Stock filter (default: show only in-stock)
    if (!matchesBooleanFilter(plant.is_in_stock, filters.is_in_stock)) {
      return false;
    }
    
    // Habitat & Adaptation filters
    if (!matchesArrayFilter(plant.exposure, filters.exposure)) {
      return false;
    }
    
    if (!matchesEnumFilter(plant.water, filters.water)) {
      return false;
    }
    
    if (!matchesEnumFilter(plant.humidity, filters.humidity)) {
      return false;
    }
    
    if (!matchesArrayFilter(plant.climate_zones, filters.climate_zones)) {
      return false;
    }
    
    if (!matchesTemperatureFilter(plant.min_temp_c, filters.min_temp_c)) {
      return false;
    }
    
    // Commercial Selection filters
    if (!matchesEnumFilter(plant.plant_type, filters.plant_type)) {
      return false;
    }
    
    if (!matchesEnumFilter(plant.rarity, filters.rarity)) {
      return false;
    }
    
    if (!matchesEnumFilter(plant.difficulty, filters.difficulty)) {
      return false;
    }
    
    if (!matchesEnumFilter(plant.growth_rate, filters.growth_rate)) {
      return false;
    }
    
    if (!matchesArrayFilter(plant.plant_use, filters.plant_use)) {
      return false;
    }
    
    // Price range
    if (!matchesNumericRange(plant.price, filters.price_min, filters.price_max)) {
      return false;
    }
    
    // Search
    if (!matchesSearch(plant, filters.search)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get count of plants matching each filter value
 * Useful for showing filter counts in UI
 */
export function getFilterCounts<T extends CatalogPlant>(
  catalog: T[],
  field: keyof CatalogPlant
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  catalog.forEach(plant => {
    const value = plant[field];
    
    if (Array.isArray(value)) {
      value.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
    } else if (typeof value === 'string') {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  
  return counts;
}

/**
 * Get unique values for a field in the catalog
 * Useful for populating filter dropdowns
 */
export function getUniqueValues<T extends CatalogPlant>(
  catalog: T[],
  field: keyof CatalogPlant
): string[] {
  const values = new Set<string>();
  
  catalog.forEach(plant => {
    const value = plant[field];
    
    if (Array.isArray(value)) {
      value.forEach(v => values.add(v));
    } else if (typeof value === 'string') {
      values.add(value);
    }
  });
  
  return Array.from(values).sort();
}

/**
 * Sort catalog by specified field and direction
 */
export type SortField = 'name' | 'price' | 'created_at' | 'rarity' | 'difficulty';
export type SortDirection = 'asc' | 'desc';

export function sortCatalog<T extends CatalogPlant>(
  catalog: T[],
  field: SortField = 'name',
  direction: SortDirection = 'asc'
): T[] {
  const sorted = [...catalog].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    // Handle null/undefined
    if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;
    
    // Convert to comparable values
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}
