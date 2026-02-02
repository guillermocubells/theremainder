import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ObservationCondition = 'healthy' | 'okay' | 'concern' | 'critical';

export interface Observation {
  id: string;
  owned_plant_id: string;
  user_id: string;
  observation_date: string;
  condition: ObservationCondition;
  notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  owned_plants?: {
    nickname: string;
    photos: string[];
  } | null;
}

export type ObservationInput = {
  owned_plant_id: string;
  observation_date?: string;
  condition: ObservationCondition;
  notes?: string | null;
  photos?: string[];
};

export const useObservations = (plantId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['observations', plantId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('plant_observations')
        .select(`
          *,
          owned_plants (nickname, photos)
        `)
        .eq('user_id', user.id)
        .order('observation_date', { ascending: false });
      
      if (plantId) {
        query = query.eq('owned_plant_id', plantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Observation[];
    },
    enabled: !!user,
  });
};

export const useRecentObservations = (limit: number = 5) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-observations', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('plant_observations')
        .select(`
          *,
          owned_plants (nickname, photos)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Observation[];
    },
    enabled: !!user,
  });
};

export const useCreateObservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (observation: ObservationInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('plant_observations')
        .insert([{ 
          ...observation, 
          user_id: user.id,
          observation_date: observation.observation_date || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      queryClient.invalidateQueries({ queryKey: ['recent-observations'] });
      queryClient.invalidateQueries({ queryKey: ['owned-plant', variables.owned_plant_id] });
    },
  });
};

export const useUpdateObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Observation> & { id: string }) => {
      const { data, error } = await supabase
        .from('plant_observations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      queryClient.invalidateQueries({ queryKey: ['recent-observations'] });
    },
  });
};

export const useDeleteObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plant_observations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      queryClient.invalidateQueries({ queryKey: ['recent-observations'] });
    },
  });
};
