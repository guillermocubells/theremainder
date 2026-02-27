/**
 * Search Index Schema Configuration
 * Defines fields, analyzers, facets, sortable fields, and relevance signals
 * for the plant catalog search engine.
 *
 * This config is the single source of truth consumed by:
 *   - useAISearch (client-side fast filter)
 *   - recommend-plants edge function (AI tier)
 *   - PlantFilters component (facet UI)
 */

// ── Searchable fields ────────────────────────────────────────────────
export interface SearchableField {
  column: string;
  analyzer: 'standard' | 'ngram' | 'keyword_lower' | 'stopwords';
  boost: number;
  /** If true, field is included in the AI prompt payload */
  includeInAI: boolean;
}

export const SEARCHABLE_FIELDS: SearchableField[] = [
  { column: 'name',            analyzer: 'ngram',         boost: 3.0, includeInAI: true  },
  { column: 'common_name',     analyzer: 'ngram',         boost: 2.5, includeInAI: true  },
  { column: 'scientific_name', analyzer: 'keyword_lower', boost: 2.0, includeInAI: true  },
  { column: 'family',          analyzer: 'keyword_lower', boost: 1.0, includeInAI: false },
  { column: 'variety',         analyzer: 'standard',      boost: 1.5, includeInAI: false },
  { column: 'description',     analyzer: 'stopwords',     boost: 1.0, includeInAI: false },
  { column: 'notes',           analyzer: 'standard',      boost: 0.5, includeInAI: false },
];

// ── Facet-enabled fields ─────────────────────────────────────────────
export type FacetType = 'enum' | 'keyword_array' | 'boolean' | 'range';

export interface FacetField {
  column: string;
  label_es: string;
  label_en: string;
  type: FacetType;
  multiSelect: boolean;
  values?: string[];
}

export const FACET_FIELDS: FacetField[] = [
  {
    column: 'plant_type',
    label_es: 'Tipo de planta',
    label_en: 'Plant type',
    type: 'enum',
    multiSelect: true,
    values: ['palm', 'fern', 'tree', 'cycad', 'succulent', 'shrub', 'other'],
  },
  {
    column: 'difficulty',
    label_es: 'Dificultad',
    label_en: 'Difficulty',
    type: 'enum',
    multiSelect: true,
    values: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  {
    column: 'rarity',
    label_es: 'Rareza',
    label_en: 'Rarity',
    type: 'enum',
    multiSelect: true,
    values: ['common', 'uncommon', 'medium', 'rare', 'very_rare', 'ultra_rare'],
  },
  {
    column: 'water',
    label_es: 'Riego',
    label_en: 'Watering',
    type: 'enum',
    multiSelect: true,
    values: ['low', 'medium', 'high'],
  },
  {
    column: 'humidity',
    label_es: 'Humedad',
    label_en: 'Humidity',
    type: 'enum',
    multiSelect: true,
    values: ['low', 'medium', 'high'],
  },
  {
    column: 'exposure',
    label_es: 'Exposición',
    label_en: 'Exposure',
    type: 'keyword_array',
    multiSelect: true,
  },
  {
    column: 'climate_zones',
    label_es: 'Zona climática',
    label_en: 'Climate zone',
    type: 'keyword_array',
    multiSelect: true,
  },
  {
    column: 'hardiness_zones',
    label_es: 'Zona de rusticidad',
    label_en: 'Hardiness zone',
    type: 'keyword_array',
    multiSelect: true,
  },
  {
    column: 'plant_use',
    label_es: 'Uso',
    label_en: 'Use',
    type: 'keyword_array',
    multiSelect: true,
  },
];

// ── Sortable fields ──────────────────────────────────────────────────
export interface SortOption {
  key: string;
  column: string;
  direction: 'asc' | 'desc';
  label_es: string;
  label_en: string;
  isDefault?: boolean;
}

export const SORT_OPTIONS: SortOption[] = [
  { key: 'relevance',    column: 'display_order', direction: 'asc',  label_es: 'Relevancia',      label_en: 'Relevance',      isDefault: true },
  { key: 'price_asc',    column: 'price',         direction: 'asc',  label_es: 'Precio: menor',   label_en: 'Price: low'     },
  { key: 'price_desc',   column: 'price',         direction: 'desc', label_es: 'Precio: mayor',   label_en: 'Price: high'    },
  { key: 'newest',       column: 'created_at',    direction: 'desc', label_es: 'Más recientes',   label_en: 'Newest'         },
  { key: 'name_asc',     column: 'name',          direction: 'asc',  label_es: 'Nombre A-Z',      label_en: 'Name A-Z'       },
  { key: 'rarity_desc',  column: 'rarity',        direction: 'desc', label_es: 'Más raro',        label_en: 'Rarest first'   },
];

// ── Relevance signals ────────────────────────────────────────────────
export interface RelevanceSignal {
  name: string;
  condition: string;
  weight: number;
  description: string;
}

export const RELEVANCE_SIGNALS: RelevanceSignal[] = [
  { name: 'is_featured',        condition: 'is_featured = true',              weight: 1.5,  description: 'Featured items get 50% boost' },
  { name: 'in_stock',           condition: 'stock_qty > 0',                   weight: 1.3,  description: 'In-stock items get 30% boost' },
  { name: 'has_images',         condition: 'product_images IS NOT NULL',      weight: 1.1,  description: 'Items with images get 10% boost' },
  { name: 'on_sale',            condition: 'sale_price IS NOT NULL',          weight: 1.05, description: 'Items on sale get 5% boost' },
  { name: 'viability_context',  condition: 'postal_code detected in query',  weight: 1.2,  description: 'Viability score multiplier when geo context present' },
];

// ── Synonym groups ───────────────────────────────────────────────────
export const SYNONYM_GROUPS: Record<string, string[]> = {
  palmera:   ['palm', 'arecaceae', 'rhopalostylis', 'brahea', 'sabal', 'chamaedorea', 'trachycarpus', 'phoenix', 'washingtonia', 'butia'],
  helecho:   ['fern', 'cyathea', 'dicksonia', 'arborescente', 'tree fern'],
  tropical:  ['cálido', 'exótico', 'subtropical', 'baleares'],
  frío:      ['resistente', 'heladas', 'continental', 'cantabria', 'hardy'],
  sol:       ['soleada', 'luz', 'directo', 'pleno', 'full sun'],
  sombra:    ['sombreada', 'semisombra', 'filtrada', 'shade', 'partial shade'],
  interior:  ['indoor', 'maceta', 'salón', 'oficina'],
  exterior:  ['outdoor', 'jardín', 'terraza', 'patio'],
  riego:     ['agua', 'húmedo', 'sequía', 'watering'],
  raro:      ['rare', 'coleccionista', 'collector', 'exclusivo'],
};

// ── Pre-filters (always applied in shop views) ──────────────────────
export const SHOP_PREFILTERS = {
  is_active: true,
  stock_gt: 0,
} as const;

// ── AI search config ─────────────────────────────────────────────────
export const AI_SEARCH_CONFIG = {
  /** Edge function name for AI recommendations */
  functionName: 'recommend-plants',
  /** Model used in AI tier */
  model: 'google/gemini-2.5-flash',
  /** Max results from AI */
  maxResults: 3,
  /** Temperature for AI calls */
  temperature: 0.3,
  /** Rate limits */
  rateLimits: {
    authenticated: 30,   // per hour
    anonymous: 10,        // per hour
  },
  /** Columns sent to AI prompt (to minimize token usage) */
  aiPromptColumns: [
    'id', 'name', 'scientific_name', 'plant_type',
    'exposure', 'min_temp_c', 'water', 'price',
  ] as const,
};

// ── Rarity ordinal mapping (for sort) ────────────────────────────────
export const RARITY_ORDINAL: Record<string, number> = {
  common: 1,
  uncommon: 2,
  medium: 3,
  rare: 4,
  very_rare: 5,
  ultra_rare: 6,
};
