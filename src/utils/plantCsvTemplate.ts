// CSV Template Generator for Plant Products

export interface PlantCsvRow {
  // Identificación
  slug: string;
  name: string;
  scientific_name: string;
  common_name: string;
  
  // Categorización
  plant_type: string;
  category_slug: string;
  
  // Descripciones
  short_description: string;
  description: string;
  notes: string;
  
  // Precio y Stock
  price: number;
  sale_price: number | null;
  stock_qty: number;
  is_in_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  
  // Especificaciones Técnicas
  container_size: string;
  germination_date: string;
  mature_height: string;
  mature_width: string;
  growth_rate: string;
  
  // Clima y Cultivo
  climate_zones: string;
  hardiness_zone: string;
  min_temp_c: number | null;
  exposure: string;
  sun_requirement: string;
  water: string;
  water_requirement: string;
  humidity: string;
  temperature_range: string;
  
  // Dificultad y Rareza
  difficulty: string;
  rarity: string;
  
  // Origen
  origin_country: string;
  origin_region: string;
  native_habitat: string;
  
  // Uso
  plant_use: string;
  
  // Imágenes
  images: string;
  thumbnail_url: string;
  
  // SEO
  meta_title: string;
  meta_description: string;
  
  // Contenido JSON
  care_instructions_watering: string;
  care_instructions_fertilizing: string;
  care_instructions_pruning: string;
  care_instructions_repotting: string;
  curious_facts: string;
  specifications_familia: string;
  specifications_genero: string;
}

const CSV_HEADERS = [
  'slug',
  'name',
  'scientific_name',
  'common_name',
  'plant_type (palm|fern|cycad|tree|shrub|bamboo|succulent|cactus|bromeliad|other)',
  'category_slug',
  'short_description',
  'description',
  'notes',
  'price',
  'sale_price',
  'stock_qty',
  'is_in_stock (true|false)',
  'is_active (true|false)',
  'is_featured (true|false)',
  'display_order',
  'container_size',
  'germination_date',
  'mature_height',
  'mature_width',
  'growth_rate (Lento|Medio|Rápido)',
  'climate_zones (separar con |)',
  'hardiness_zone',
  'min_temp_c',
  'exposure (full_sun|partial_shade|full_shade - separar con |)',
  'sun_requirement',
  'water (low|medium|high)',
  'water_requirement',
  'humidity (low|medium|high)',
  'temperature_range',
  'difficulty (easy|intermediate|advanced)',
  'rarity (common|medium|rare|very_rare)',
  'origin_country',
  'origin_region',
  'native_habitat',
  'plant_use (indoor|outdoor|container|landscape - separar con |)',
  'images (URLs separadas con |)',
  'thumbnail_url',
  'meta_title',
  'meta_description',
  'care_instructions_watering',
  'care_instructions_fertilizing',
  'care_instructions_pruning',
  'care_instructions_repotting',
  'curious_facts (separar con |)',
  'specifications_familia',
  'specifications_genero'
];

const EXAMPLE_ROW = [
  'rhopalostylis-sapida',
  'Rhopalostylis sapida',
  'Rhopalostylis sapida',
  'Palmera Nikau',
  'palm',
  'palmeras',
  'La única palmera nativa de Nueva Zelanda',
  'Elegante palmera con tronco distintivo anillado y corona de hojas pinnadas. Originaria de Nueva Zelanda, es resistente y adaptable.',
  'Variedad Oceana muy resistente al frío',
  '85',
  '',
  '4',
  'true',
  'true',
  'false',
  '0',
  '3 litros',
  'Marzo 2023',
  '10-15m',
  '2-3m',
  'Medio',
  '9a|9b|10a|10b|11a|11b',
  '9a-11b',
  '-5',
  'partial_shade',
  'Semisol',
  'medium',
  'Moderada',
  'medium',
  '5°C - 35°C',
  'intermediate',
  'rare',
  'Nueva Zelanda',
  'Isla Norte',
  'Bosques subtropicales húmedos',
  'outdoor|container|landscape',
  '/lovable-uploads/imagen1.png|/lovable-uploads/imagen2.png',
  '/lovable-uploads/imagen1.png',
  'Rhopalostylis sapida | Palmera Nikau | Frondaprima',
  'Compra Rhopalostylis sapida, la única palmera nativa de Nueva Zelanda. Envío a toda España.',
  'Riego moderado, mantener sustrato húmedo',
  'Fertilizar cada 2 meses en primavera-verano',
  'Eliminar hojas secas',
  'Cada 2-3 años',
  'Es la palmera más austral del mundo|Puede vivir más de 200 años',
  'Arecaceae',
  'Rhopalostylis'
];

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generatePlantCsvTemplate(): string {
  const headerRow = CSV_HEADERS.map(escapeCSV).join(',');
  const exampleRow = EXAMPLE_ROW.map(escapeCSV).join(',');
  const emptyRow = CSV_HEADERS.map(() => '').join(',');
  
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  
  return BOM + [headerRow, exampleRow, emptyRow, emptyRow, emptyRow].join('\n');
}

export function downloadPlantCsvTemplate(): void {
  const csv = generatePlantCsvTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_productos_frondaprima.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// JSON template for reference
export const PLANT_JSON_TEMPLATE = {
  "// IDENTIFICACIÓN": "---",
  slug: "nombre-planta-en-minusculas",
  name: "Nombre Científico",
  scientific_name: "Nombre Científico",
  common_name: "Nombre Común",
  
  "// CATEGORIZACIÓN": "---",
  plant_type: "palm | fern | cycad | tree | shrub | bamboo | succulent | cactus | bromeliad | other",
  category_slug: "palmeras | helechos-arboreos | cicadas | arbustos-ornamentales",
  
  "// DESCRIPCIONES": "---",
  short_description: "Descripción corta para listados (max 100 chars)",
  description: "Descripción larga con detalles botánicos completos",
  notes: "Notas internas del vendedor (no públicas)",
  
  "// PRECIO Y STOCK": "---",
  price: 85.00,
  sale_price: null,
  stock_qty: 4,
  is_in_stock: true,
  is_active: true,
  is_featured: false,
  display_order: 0,
  
  "// ESPECIFICACIONES TÉCNICAS": "---",
  container_size: "3 litros | 5 litros | 7 litros | 10 litros",
  germination_date: "Marzo 2023",
  mature_height: "10-15m",
  mature_width: "2-3m",
  growth_rate: "Lento | Medio | Rápido",
  
  "// CLIMA Y CULTIVO": "---",
  climate_zones: ["9a", "9b", "10a", "10b", "11a", "11b"],
  hardiness_zone: "9a-11b",
  min_temp_c: -5,
  exposure: ["full_sun", "partial_shade", "full_shade"],
  sun_requirement: "Soleada | Semisol | Semisombra | Sombreada",
  water: "low | medium | high",
  water_requirement: "Baja | Moderada | Alta",
  humidity: "low | medium | high",
  temperature_range: "5°C - 35°C",
  
  "// DIFICULTAD Y RAREZA": "---",
  difficulty: "easy | intermediate | advanced",
  rarity: "common | medium | rare | very_rare",
  
  "// ORIGEN": "---",
  origin_country: "Nueva Zelanda",
  origin_region: "Isla Norte",
  native_habitat: "Bosques subtropicales húmedos",
  
  "// USO": "---",
  plant_use: ["indoor", "outdoor", "container", "landscape"],
  
  "// IMÁGENES": "---",
  images: ["/lovable-uploads/imagen1.png", "/lovable-uploads/imagen2.png"],
  thumbnail_url: "/lovable-uploads/imagen1.png",
  
  "// SEO": "---",
  meta_title: "Nombre | Nombre Común | Frondaprima (max 60 chars)",
  meta_description: "Descripción para buscadores (max 160 chars)",
  
  "// CONTENIDO ENRIQUECIDO": "---",
  care_instructions: {
    watering: "Instrucciones de riego",
    fertilizing: "Instrucciones de fertilización",
    pruning: "Instrucciones de poda",
    repotting: "Instrucciones de trasplante"
  },
  curious_facts: [
    "Dato curioso 1",
    "Dato curioso 2"
  ],
  specifications: {
    familia: "Arecaceae",
    genero: "Rhopalostylis"
  }
};
