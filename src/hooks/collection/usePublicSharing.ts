import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PublicSlug {
  id: string;
  owned_plant_id: string;
  slug: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const usePublicSlug = (plantId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['public-slug', plantId],
    queryFn: async () => {
      if (!user || !plantId) return null;
      
      const { data, error } = await supabase
        .from('plant_public_slugs')
        .select('*')
        .eq('owned_plant_id', plantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PublicSlug | null;
    },
    enabled: !!user && !!plantId,
  });
};

export const usePublicPlant = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['public-plant', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data: slugData, error: slugError } = await supabase
        .from('plant_public_slugs')
        .select('owned_plant_id')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();
      
      if (slugError || !slugData) return null;
      
      // Get plant info using secure view (excludes sensitive location data)
      const { data: plantData, error: plantError } = await supabase
        .from('owned_plants_public')
        .select(`
          id,
          nickname,
          scientific_name,
          common_name,
          photos,
          status
        `)
        .eq('id', slugData.owned_plant_id)
        .single();
      
      if (plantError) return null;
      
      // Get recent observations
      const { data: observations } = await supabase
        .from('plant_observations')
        .select('observation_date, condition, notes, photos')
        .eq('owned_plant_id', slugData.owned_plant_id)
        .order('observation_date', { ascending: false })
        .limit(5);
      
      return {
        ...plantData,
        observations: observations || [],
      };
    },
    enabled: !!slug,
  });
};

export const useCreatePublicSlug = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plantId: string) => {
      // Generate slug using database function
      const { data: slugResult } = await supabase.rpc('generate_plant_slug');
      const slug = slugResult as string;
      
      const { data, error } = await supabase
        .from('plant_public_slugs')
        .insert([{ 
          owned_plant_id: plantId, 
          slug,
          is_public: false 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, plantId) => {
      queryClient.invalidateQueries({ queryKey: ['public-slug', plantId] });
    },
  });
};

export const useTogglePublicSharing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slugId, isPublic, plantId }: { slugId: string; isPublic: boolean; plantId: string }) => {
      const { data, error } = await supabase
        .from('plant_public_slugs')
        .update({ is_public: isPublic })
        .eq('id', slugId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, plantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['public-slug', data.plantId] });
    },
  });
};

export const useDeletePublicSlug = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slugId, plantId }: { slugId: string; plantId: string }) => {
      const { error } = await supabase
        .from('plant_public_slugs')
        .delete()
        .eq('id', slugId);
      
      if (error) throw error;
      return plantId;
    },
    onSuccess: (plantId) => {
      queryClient.invalidateQueries({ queryKey: ['public-slug', plantId] });
    },
  });
};
