import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { plants } from '@/data/plants';

export interface StockNotification {
  id: string;
  user_id: string;
  plant_id: string;
  email: string;
  notified_at: string | null;
  created_at: string;
  // Derived from local plants data
  plantData?: {
    id: string;
    name: string;
    scientificName: string;
    thumbnailUrl: string | undefined;
    price: number | undefined;
    stockQty: number;
  } | null;
}

export const useStockNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stock-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('stock_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich with local plant data
      return data.map(notification => {
        const localPlant = plants.find(p => p.id === notification.plant_id);
        return {
          ...notification,
          plantData: localPlant ? {
            id: localPlant.id,
            name: localPlant.name,
            scientificName: localPlant.commonName,
            thumbnailUrl: localPlant.images?.[0],
            price: localPlant.price,
            stockQty: localPlant.quantity,
          } : null,
        } as StockNotification;
      });
    },
    enabled: !!user,
  });
};

export const useDeleteStockNotification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (plantId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('stock_notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('plant_id', plantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-notifications'] });
    },
  });
};
