import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlistItems } from '@/hooks/wishlist/useWishlistItems';
import { useOwnedPlants } from '@/hooks/collection/useOwnedPlants';
import { useRecentObservations } from '@/hooks/collection/useObservations';
import { PlantItem, PlantItemStatus, GardenFilters } from './types';

// Transform wishlist item to PlantItem
const transformWishlistToPlantItem = (item: any): PlantItem => {
  const isAcquired = item.status === 'acquired';
  const isInStock = item.plants?.stock_qty > 0;
  
  let status: PlantItemStatus = 'searching';
  if (isAcquired) {
    status = 'in_collection';
  } else if (isInStock) {
    status = 'available';
  }
  
  return {
    id: `wishlist-${item.id}`,
    sourceType: 'wishlist',
    sourceId: item.id,
    name: item.name,
    scientificName: item.scientific_name,
    commonName: item.plants?.name || null,
    imageUrl: item.image_url || item.plants?.thumbnail_url || null,
    status,
    wishlistData: {
      priority: item.priority,
      notifyAvailability: item.notify_availability,
      notifyPriceDrop: item.notify_price_drop,
      sourcePreference: item.source_preference,
      providerName: item.provider_name,
      priceMin: item.price_min,
      priceMax: item.price_max,
      notes: item.notes,
      catalogProductId: item.catalog_product_id,
      isInStock,
      catalogPrice: item.plants?.price || null,
    },
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
};

// Transform owned plant to PlantItem
const transformOwnedToPlantItem = (plant: any, lastObservation?: any): PlantItem => {
  let status: PlantItemStatus = 'in_collection';
  if (plant.status === 'removed') {
    status = 'archived';
  }
  
  return {
    id: `owned-${plant.id}`,
    sourceType: 'owned',
    sourceId: plant.id,
    name: plant.nickname,
    scientificName: plant.scientific_name,
    commonName: plant.common_name,
    imageUrl: plant.photos?.[0] || null,
    status,
    collectionData: {
      nickname: plant.nickname,
      purchaseDate: plant.purchase_date,
      plantStatus: plant.status,
      locationName: plant.plant_locations?.name || plant.location_text,
      locationId: plant.location_id,
      tags: plant.tags || [],
      nextCheckinDate: plant.next_checkin_date,
      serialCode: plant.serial_code,
      photos: plant.photos || [],
      lastObservation: lastObservation ? {
        date: lastObservation.observation_date,
        condition: lastObservation.condition,
        notes: lastObservation.notes,
      } : undefined,
    },
    createdAt: plant.created_at,
    updatedAt: plant.updated_at,
  };
};

export const useMyGarden = (filters?: GardenFilters) => {
  const { user } = useAuth();
  const { data: wishlistItems, isLoading: wishlistLoading } = useWishlistItems();
  const { data: ownedPlants, isLoading: plantsLoading } = useOwnedPlants();
  const { data: recentObservations } = useRecentObservations(50);

  return useQuery({
    queryKey: ['my-garden', user?.id, filters, wishlistItems, ownedPlants, recentObservations],
    queryFn: async () => {
      const items: PlantItem[] = [];
      
      // Create a map of plant ID to last observation
      const observationMap = new Map<string, any>();
      recentObservations?.forEach(obs => {
        if (!observationMap.has(obs.owned_plant_id)) {
          observationMap.set(obs.owned_plant_id, obs);
        }
      });
      
      // Transform wishlist items (only non-acquired ones, to avoid duplicates)
      wishlistItems?.forEach(item => {
        if (item.status !== 'acquired') {
          items.push(transformWishlistToPlantItem(item));
        }
      });
      
      // Transform owned plants
      ownedPlants?.forEach(plant => {
        const lastObs = observationMap.get(plant.id);
        items.push(transformOwnedToPlantItem(plant, lastObs));
      });
      
      // Apply filters
      let filtered = items;
      
      if (filters?.filter && filters.filter !== 'all') {
        switch (filters.filter) {
          case 'searching':
            filtered = items.filter(i => i.status === 'searching' || i.status === 'available');
            break;
          case 'in_collection':
            filtered = items.filter(i => i.status === 'in_collection' && i.sourceType === 'owned');
            break;
          case 'archived':
            filtered = items.filter(i => i.status === 'archived');
            break;
        }
      }
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(i => 
          i.name.toLowerCase().includes(searchLower) ||
          i.scientificName?.toLowerCase().includes(searchLower) ||
          i.commonName?.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort: newest first
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return filtered;
    },
    enabled: !!user && !wishlistLoading && !plantsLoading,
  });
};

export const useGardenStats = () => {
  const { user } = useAuth();
  const { data: wishlistItems } = useWishlistItems();
  const { data: ownedPlants } = useOwnedPlants();

  return useQuery({
    queryKey: ['garden-stats', user?.id, wishlistItems?.length, ownedPlants?.length],
    queryFn: async () => {
      const searching = wishlistItems?.filter(i => i.status !== 'acquired').length || 0;
      const available = wishlistItems?.filter(i => i.status !== 'acquired' && i.plants?.stock_qty > 0).length || 0;
      const inCollection = ownedPlants?.filter(p => p.status !== 'removed').length || 0;
      const archived = ownedPlants?.filter(p => p.status === 'removed').length || 0;
      
      return {
        searching,
        available,
        inCollection,
        archived,
        total: searching + inCollection,
      };
    },
    enabled: !!user,
  });
};
