import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlantReview {
  id: string;
  plant_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  score: number;
  created_at: string;
}

export const usePlantReviews = (plantId: string) => {
  return useQuery({
    queryKey: ['plant-reviews', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_reviews')
        .select('*')
        .eq('plant_id', plantId)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlantReview[];
    },
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (review: { plant_id: string; author_name: string; rating: number; comment: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('plant_reviews')
        .insert({ ...review, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as PlantReview;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plant-reviews', data.plant_id] });
    },
  });
};
