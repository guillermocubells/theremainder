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
      const { data, error } = await supabase
        .rpc('get_public_shared_list_by_slug' as any, { p_slug: slug });

      if (error) throw error;
      if (!data) return null;

      const result = data as any;

      // Enrich stock notifications with catalog plant data from DB
      const stockNotifRaw = result.stockNotifications || [];
      const plantIds = stockNotifRaw.map((n: any) => n.plant_id).filter(Boolean);

      let plantMap: Record<string, any> = {};
      if (plantIds.length > 0) {
        const { data: plantsData } = await supabase
          .from('plants')
          .select('id, name, scientific_name, images, price, stock_qty')
          .in('id', plantIds);

        (plantsData || []).forEach((p: any) => {
          plantMap[p.id] = p;
        });
      }

      const stockNotifications = stockNotifRaw.map((n: any) => {
        const p = plantMap[n.plant_id];
        return {
          ...n,
          plantData: p ? {
            name: p.name,
            scientificName: p.scientific_name,
            thumbnailUrl: p.images?.[0] || null,
            price: p.price,
            isInStock: (p.stock_qty || 0) > 0,
          } : null,
        };
      });

      return {
        sharedList: result.sharedList as SharedSearchList,
        wishlistItems: result.wishlistItems || [],
        stockNotifications,
      };
    },
    enabled: !!slug,
  });
};
