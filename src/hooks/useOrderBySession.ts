import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from './useOrders';

export const useOrderBySession = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['order-by-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Order | null;
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Poll every 2s until we get the order (webhook may be processing)
      return query.state.data ? false : 2000;
    },
    retry: 5,
    retryDelay: 1500,
  });
};
