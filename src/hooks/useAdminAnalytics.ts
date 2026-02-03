import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  orders: {
    total: number;
    paid: number;
    conversion_rate: number;
  };
  revenue: {
    total: number;
    average_order: number;
  };
  users: {
    total: number;
    new_in_period: number;
  };
  catalog: {
    total_plants: number;
    out_of_stock: number;
  };
  engagement: {
    stock_notifications: number;
    wishlist_additions: number;
  };
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  product_image: string | null;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

type Period = '7d' | '30d' | '90d' | '365d';

const fetchAnalytics = async <T>(
  endpoint: string,
  period: Period,
  params?: Record<string, string>
): Promise<T> => {
  const searchParams = new URLSearchParams({ period, ...params });
  
  const { data, error } = await supabase.functions.invoke(`api-analytics/${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: null,
  });

  // Workaround: invoke doesn't support query params well, use direct fetch
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/api-analytics/${endpoint}?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch analytics');
  }

  const result = await response.json();
  return result.data as T;
};

export const useAdminDashboard = (period: Period = '30d') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-dashboard', period, user?.id],
    queryFn: () => fetchAnalytics<DashboardMetrics>('dashboard', period),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTopProducts = (period: Period = '30d', limit = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-top-products', period, limit, user?.id],
    queryFn: () => fetchAnalytics<TopProduct[]>('top-products', period, { limit: String(limit) }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useOrdersByStatus = (period: Period = '30d') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-orders-status', period, user?.id],
    queryFn: () => fetchAnalytics<Record<string, number>>('orders-by-status', period),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useDailyRevenue = (period: Period = '30d') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-daily-revenue', period, user?.id],
    queryFn: () => fetchAnalytics<DailyRevenue[]>('daily-revenue', period),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useShippingZonesStats = (period: Period = '30d') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-shipping-zones', period, user?.id],
    queryFn: () => fetchAnalytics<Array<{ country: string; orders: number; revenue: number }>>('shipping-zones-stats', period),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};
