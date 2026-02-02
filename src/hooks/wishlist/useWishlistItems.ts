import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WishlistPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WishlistStatus = 'wishlist' | 'looking' | 'acquired';
export type WishlistSource = 'frondaprima' | 'any' | 'specific';

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  scientific_name: string | null;
  variety_notes: string | null;
  priority: WishlistPriority;
  price_min: number | null;
  price_max: number | null;
  source_preference: WishlistSource;
  provider_name: string | null;
  provider_url: string | null;
  image_url: string | null;
  notes: string | null;
  status: WishlistStatus;
  notify_availability: boolean;
  notify_price_drop: boolean;
  catalog_product_id: string | null;
  acquired_owned_plant_id: string | null;
  acquired_at: string | null;
  created_at: string;
  updated_at: string;
  plants?: {
    id: string;
    name: string;
    scientific_name: string | null;
    thumbnail_url: string | null;
    price: number;
    stock_qty: number;
  } | null;
}

export type WishlistItemInput = Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'plants' | 'acquired_at' | 'acquired_owned_plant_id'>;

export interface WishlistFilters {
  status?: WishlistStatus | null;
  priority?: WishlistPriority | null;
  source?: WishlistSource | null;
  search?: string;
}

export const useWishlistItems = (filters?: WishlistFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-items', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('wishlist_items')
        .select(`
          *,
          plants (id, name, scientific_name, thumbnail_url, price, stock_qty)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.source) {
        query = query.eq('source_preference', filters.source);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,scientific_name.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user,
  });
};

export const useWishlistItem = (itemId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-item', itemId],
    queryFn: async () => {
      if (!user || !itemId) return null;
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          *,
          plants (id, name, scientific_name, thumbnail_url, price, stock_qty)
        `)
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      return data as WishlistItem;
    },
    enabled: !!user && !!itemId,
  });
};

export const useCreateWishlistItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (item: Partial<WishlistItemInput>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([{ 
          ...item, 
          user_id: user.id,
          name: item.name || 'Nueva planta',
          status: item.status || 'wishlist',
          priority: item.priority || 'medium',
          source_preference: item.source_preference || 'any',
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
    },
  });
};

export const useUpdateWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WishlistItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-item', variables.id] });
    },
  });
};

export const useDeleteWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
    },
  });
};

export const useMoveWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WishlistStatus }) => {
      const updates: Partial<WishlistItem> = { status };
      
      if (status === 'acquired') {
        updates.acquired_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
    },
  });
};

export const useWishlistStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-stats', user?.id],
    queryFn: async () => {
      if (!user) return { wishlist: 0, looking: 0, acquired: 0 };
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('status')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const stats = { wishlist: 0, looking: 0, acquired: 0 };
      data?.forEach(item => {
        stats[item.status as WishlistStatus]++;
      });
      
      return stats;
    },
    enabled: !!user,
  });
};
