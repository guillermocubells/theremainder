import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlantNote {
  id: string;
  owned_plant_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type PlantNoteInput = {
  owned_plant_id: string;
  content: string;
};

export const usePlantNotes = (plantId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plant-notes', plantId],
    queryFn: async () => {
      if (!user || !plantId) return [];
      
      const { data, error } = await supabase
        .from('plant_notes')
        .select('*')
        .eq('owned_plant_id', plantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlantNote[];
    },
    enabled: !!user && !!plantId,
  });
};

export const useCreatePlantNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (note: PlantNoteInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('plant_notes')
        .insert([{ ...note, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plant-notes', variables.owned_plant_id] });
    },
  });
};

export const useUpdatePlantNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, owned_plant_id, content }: { id: string; owned_plant_id: string; content: string }) => {
      const { data, error } = await supabase
        .from('plant_notes')
        .update({ content })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plant-notes'] });
    },
  });
};

export const useDeletePlantNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, plantId }: { id: string; plantId: string }) => {
      const { error } = await supabase
        .from('plant_notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return plantId;
    },
    onSuccess: (plantId) => {
      queryClient.invalidateQueries({ queryKey: ['plant-notes', plantId] });
    },
  });
};
