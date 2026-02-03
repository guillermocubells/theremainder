import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  street: string;
  apartment: string | null;
  city: string;
  postal_code: string;
  province: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // Garden profile fields
  is_garden_location: boolean;
  climate_zone: string | null;
  avg_annual_rainfall_mm: number | null;
  sun_exposure: 'full_sun' | 'partial_shade' | 'shade' | null;
  soil_type: 'sandy' | 'loamy' | 'clay' | 'rocky' | 'peat' | 'mixed' | null;
  drainage: 'fast' | 'medium' | 'poor' | null;
  wind_exposure: 'low' | 'medium' | 'high' | null;
  altitude_m: number | null;
  min_winter_temp_c: number | null;
  humidity_level: 'low' | 'medium' | 'high' | null;
  frost_frequency: 'rare' | 'occasional' | 'frequent' | null;
  soil_ph: 'acid' | 'neutral' | 'alkaline' | null;
  garden_notes: string | null;
}

export type AddressInput = Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const useAddresses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user,
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (address: AddressInput) => {
      if (!user) throw new Error('Not authenticated');
      
      // If setting as default, unset other defaults first
      if (address.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }
      
      const { data, error } = await supabase
        .from('addresses')
        .insert({ ...address, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['garden-addresses', user?.id] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Address> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }
      
      const { data, error } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['garden-addresses', user?.id] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['garden-addresses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['active-garden-addresses', user?.id] });
    },
  });
};
