import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StockNotification {
  id: string;
  user_id: string;
  plant_id: string;
  email: string;
  notified_at: string | null;
  created_at: string;
  plants?: {
    id: string;
    name: string;
    scientific_name: string | null;
    thumbnail_url: string | null;
    price: number;
    stock_qty: number;
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
        .select(`
          *,
          plants (id, name, scientific_name, thumbnail_url, price, stock_qty)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StockNotification[];
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
