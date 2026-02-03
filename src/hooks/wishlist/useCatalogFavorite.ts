import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Hook to get the actual UUID from the plants table by slug
const usePlantUUID = (slugOrId: string) => {
  return useQuery({
    queryKey: ['plant-uuid', slugOrId],
    queryFn: async () => {
      // First check if it's already a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slugOrId)) {
        return slugOrId;
      }
      
      // Otherwise, look up the plant by slug
      const { data, error } = await supabase
        .from('plants')
        .select('id')
        .eq('slug', slugOrId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!slugOrId,
    // Don't cache null results for long; catalog can be populated after first load
    staleTime: 0,
  });
};

export const useCatalogFavorite = (catalogProductSlugOrId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get the actual UUID from the slug
  const { data: catalogProductId, isLoading: isLoadingUUID } = usePlantUUID(catalogProductSlugOrId);

  const { data: isFavorite, isLoading: isLoadingFavorite } = useQuery({
    queryKey: ['catalog-favorite', catalogProductId, user?.id],
    queryFn: async () => {
      if (!user || !catalogProductId) return false;
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('catalog_product_id', catalogProductId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!catalogProductId,
  });

  const addToFavorites = useMutation({
    mutationFn: async (plantData: { name: string; scientificName?: string; imageUrl?: string; price?: number }) => {
      if (!user) throw new Error('Not authenticated');
      if (!catalogProductId) throw new Error('Plant not found in catalog');
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([{
          user_id: user.id,
          catalog_product_id: catalogProductId,
          name: plantData.name,
          scientific_name: plantData.scientificName || null,
          image_url: plantData.imageUrl || null,
          price_min: plantData.price || null,
          price_max: plantData.price || null,
          status: 'looking',
          priority: 'medium',
          source_preference: 'frondaprima',
          notify_availability: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-favorite', catalogProductId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-garden'] });
      toast.success('Añadido a tu lista de búsqueda');
    },
    onError: () => {
      toast.error('Error al añadir a favoritos');
    },
  });

  const removeFromFavorites = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!catalogProductId) throw new Error('Plant not found in catalog');
      
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('catalog_product_id', catalogProductId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-favorite', catalogProductId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-garden'] });
      toast.success('Eliminado de tu lista de búsqueda');
    },
    onError: () => {
      toast.error('Error al eliminar de favoritos');
    },
  });

  const toggleFavorite = (plantData: { name: string; scientificName?: string; imageUrl?: string; price?: number }) => {
    if (!catalogProductId) {
      // Force a re-fetch in case the plant was added to the catalog after the first lookup
      queryClient.invalidateQueries({ queryKey: ['plant-uuid', catalogProductSlugOrId] });
      toast.error('No se pudo localizar la planta en el catálogo todavía. Reintenta en unos segundos.');
      return;
    }
    if (isFavorite) {
      removeFromFavorites.mutate();
    } else {
      addToFavorites.mutate(plantData);
    }
  };

  return {
    isFavorite: !!isFavorite,
    isLoading: isLoadingUUID || isLoadingFavorite,
    isToggling: addToFavorites.isPending || removeFromFavorites.isPending,
    toggleFavorite,
    addToFavorites,
    removeFromFavorites,
    catalogProductId, // Expose the resolved UUID if needed
  };
};
