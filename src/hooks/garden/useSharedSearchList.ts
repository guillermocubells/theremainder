import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SharedSearchList {
  id: string;
  user_id: string;
  slug: string;
  is_public: boolean;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useSharedSearchList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sharedList, isLoading } = useQuery({
    queryKey: ['shared-search-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('shared_search_lists')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as SharedSearchList | null;
    },
    enabled: !!user?.id,
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (params: { title?: string; description?: string; is_public?: boolean }) => {
      if (!user?.id) throw new Error('No user');

      if (sharedList) {
        // Update existing
        const { data, error } = await supabase
          .from('shared_search_lists')
          .update({
            title: params.title ?? sharedList.title,
            description: params.description ?? sharedList.description,
            is_public: params.is_public ?? sharedList.is_public,
          })
          .eq('id', sharedList.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('shared_search_lists')
          .insert({
            user_id: user.id,
            title: params.title ?? 'Mi lista de búsqueda',
            description: params.description,
            is_public: params.is_public ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-search-list', user?.id] });
    },
  });

  const togglePublic = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      if (sharedList) {
        const { data, error } = await supabase
          .from('shared_search_lists')
          .update({ is_public: !sharedList.is_public })
          .eq('id', sharedList.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create as public
        const { data, error } = await supabase
          .from('shared_search_lists')
          .insert({
            user_id: user.id,
            is_public: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-search-list', user?.id] });
      if (data.is_public) {
        toast.success('Lista compartida públicamente');
      } else {
        toast.success('Lista ya no es pública');
      }
    },
    onError: () => {
      toast.error('Error al actualizar la lista');
    },
  });

  const getShareUrl = () => {
    if (!sharedList?.slug) return null;
    return `${window.location.origin}/garden/shared/${sharedList.slug}`;
  };

  return {
    sharedList,
    isLoading,
    createOrUpdate: createOrUpdateMutation.mutate,
    togglePublic: togglePublic.mutate,
    isToggling: togglePublic.isPending,
    getShareUrl,
  };
};

// Hook for fetching public shared list by slug
export const usePublicSearchList = (slug: string) => {
  return useQuery({
    queryKey: ['public-search-list', slug],
    queryFn: async () => {
      // Fetch the shared list
      const { data: sharedList, error: listError } = await supabase
        .from('shared_search_lists')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle();

      if (listError) throw listError;
      if (!sharedList) return null;

      // Fetch wishlist items for this user
      const { data: wishlistItems, error: itemsError } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          name,
          scientific_name,
          image_url,
          priority,
          status,
          notes,
          variety_notes,
          catalog_product_id,
          plants:catalog_product_id (
            id,
            name,
            scientific_name,
            thumbnail_url,
            price,
            is_in_stock
          )
        `)
        .eq('user_id', sharedList.user_id)
        .in('status', ['wishlist', 'looking']);

      if (itemsError) throw itemsError;

      // Fetch stock notifications
      const { data: stockNotifications, error: stockError } = await supabase
        .from('stock_notifications')
        .select(`
          id,
          plant_id,
          plants:plant_id (
            id,
            name,
            scientific_name,
            thumbnail_url,
            price,
            is_in_stock
          )
        `)
        .eq('user_id', sharedList.user_id);

      if (stockError) throw stockError;

      return {
        sharedList: sharedList as SharedSearchList,
        wishlistItems: wishlistItems || [],
        stockNotifications: stockNotifications || [],
      };
    },
    enabled: !!slug,
  });
};
