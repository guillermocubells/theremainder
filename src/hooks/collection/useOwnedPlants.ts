import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlantStatus = 'alive' | 'dormant' | 'sick' | 'removed';

export interface OwnedPlant {
  id: string;
  user_id: string;
  nickname: string;
  scientific_name: string | null;
  common_name: string | null;
  photos: string[];
  purchase_date: string | null;
  status: PlantStatus;
  location_id: string | null;
  location_text: string | null;
  tags: string[];
  next_checkin_date: string | null;
  source_plant_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  serial_code: string | null;
  created_at: string;
  updated_at: string;
  plant_locations?: {
    id: string;
    name: string;
  } | null;
}

export type OwnedPlantInput = Omit<OwnedPlant, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'plant_locations' | 'order_id' | 'order_item_id' | 'serial_code'>;

export interface OwnedPlantsFilters {
  status?: PlantStatus | null;
  location_id?: string | null;
  tag?: string | null;
  search?: string;
}

export const useOwnedPlants = (filters?: OwnedPlantsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owned-plants', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('owned_plants')
        .select(`
          *,
          plant_locations (id, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      if (filters?.tag) {
        query = query.contains('tags', [filters.tag]);
      }
      if (filters?.search) {
        query = query.or(`nickname.ilike.%${filters.search}%,common_name.ilike.%${filters.search}%,scientific_name.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as OwnedPlant[];
    },
    enabled: !!user,
  });
};

export const useOwnedPlant = (plantId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owned-plant', plantId],
    queryFn: async () => {
      if (!user || !plantId) return null;
      
      const { data, error } = await supabase
        .from('owned_plants')
        .select(`
          *,
          plant_locations (id, name)
        `)
        .eq('id', plantId)
        .single();
      
      if (error) throw error;
      return data as OwnedPlant;
    },
    enabled: !!user && !!plantId,
  });
};

export const useCreateOwnedPlant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (plant: OwnedPlantInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('owned_plants')
        .insert([{ ...plant, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-plants'] });
    },
  });
};

export const useUpdateOwnedPlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OwnedPlant> & { id: string }) => {
      const { data, error } = await supabase
        .from('owned_plants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['owned-plants'] });
      queryClient.invalidateQueries({ queryKey: ['owned-plant', variables.id] });
    },
  });
};

export const useDeleteOwnedPlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('owned_plants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-plants'] });
    },
  });
};

export const useBatchUpdatePlants = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<OwnedPlant> }) => {
      const { error } = await supabase
        .from('owned_plants')
        .update(updates)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-plants'] });
    },
  });
};
