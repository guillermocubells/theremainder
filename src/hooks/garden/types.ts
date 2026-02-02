// Unified PlantItem model for "Mi Jardín"
// Combines wishlist items and owned plants into a single experience

export type PlantItemStatus = 
  | 'searching'    // En búsqueda (wishlist/looking)
  | 'available'    // Disponible en catálogo
  | 'purchased'    // Comprada (transición)
  | 'in_collection' // En colección (owned)
  | 'archived';    // Archivada

export type PlantHealthStatus = 'healthy' | 'okay' | 'concern' | 'critical';

export interface PlantItem {
  id: string;
  sourceType: 'wishlist' | 'owned';
  sourceId: string; // Original ID from wishlist_items or owned_plants
  
  // Common fields
  name: string;
  scientificName: string | null;
  commonName: string | null;
  imageUrl: string | null;
  
  // Status
  status: PlantItemStatus;
  
  // Wishlist-specific (when sourceType === 'wishlist')
  wishlistData?: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    notifyAvailability: boolean;
    notifyPriceDrop: boolean;
    sourcePreference: 'frondaprima' | 'any' | 'specific';
    providerName: string | null;
    priceMin: number | null;
    priceMax: number | null;
    notes: string | null;
    catalogProductId: string | null;
    isInStock: boolean;
    catalogPrice: number | null;
  };
  
  // Collection-specific (when sourceType === 'owned')
  collectionData?: {
    nickname: string;
    purchaseDate: string | null;
    plantStatus: 'alive' | 'dormant' | 'sick' | 'removed';
    locationName: string | null;
    locationId: string | null;
    tags: string[];
    nextCheckinDate: string | null;
    serialCode: string | null;
    photos: string[];
    lastObservation?: {
      date: string;
      condition: PlantHealthStatus;
      notes: string | null;
    };
  };
  
  createdAt: string;
  updatedAt: string;
}

export type GardenFilter = 'all' | 'searching' | 'in_collection' | 'archived';

export interface GardenFilters {
  filter: GardenFilter;
  search?: string;
}
