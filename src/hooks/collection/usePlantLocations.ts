import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlantLocation {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type PlantLocationInput = {
  name: string;
  description?: string | null;
};

export const usePlantLocations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plant-locations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('plant_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as PlantLocation[];
    },
    enabled: !!user,
  });
};

export const useCreatePlantLocation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (location: PlantLocationInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('plant_locations')
        .insert([{ ...location, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-locations'] });
    },
  });
};

export const useUpdatePlantLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlantLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('plant_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-locations'] });
    },
  });
};

export const useDeletePlantLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plant_locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-locations'] });
    },
  });
};
