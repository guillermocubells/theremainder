import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCatalogFavorite = (catalogProductId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFavorite, isLoading } = useQuery({
    queryKey: ['catalog-favorite', catalogProductId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
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
    if (isFavorite) {
      removeFromFavorites.mutate();
    } else {
      addToFavorites.mutate(plantData);
    }
  };

  return {
    isFavorite: !!isFavorite,
    isLoading,
    isToggling: addToFavorites.isPending || removeFromFavorites.isPending,
    toggleFavorite,
    addToFavorites,
    removeFromFavorites,
  };
};
