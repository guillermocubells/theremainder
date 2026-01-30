import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlantFinderAnswers } from '@/components/PlantFinder/types';
import { Json } from '@/integrations/supabase/types';

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: PlantFinderAnswers;
  created_at: string;
  updated_at: string;
}

const parseFilters = (filters: Json): PlantFinderAnswers => {
  if (typeof filters === 'object' && filters !== null && !Array.isArray(filters)) {
    return {
      plantGroup: (filters as Record<string, unknown>).plantGroup as string | null ?? null,
      location: (filters as Record<string, unknown>).location as string | null ?? null,
      sunExposure: (filters as Record<string, unknown>).sunExposure as string | null ?? null,
      waterNeeds: (filters as Record<string, unknown>).waterNeeds as string | null ?? null,
      growthRate: (filters as Record<string, unknown>).growthRate as string | null ?? null,
      wowFactor: (filters as Record<string, unknown>).wowFactor as string | null ?? null,
      hardinessZone: (filters as Record<string, unknown>).hardinessZone as string | null ?? null,
    };
  }
  return {
    plantGroup: null,
    location: null,
    sunExposure: null,
    waterNeeds: null,
    growthRate: null,
    wowFactor: null,
    hardinessZone: null,
  };
};

export const useSavedSearches = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        filters: parseFilters(item.filters),
      })) as SavedSearch[];
    },
    enabled: !!user,
  });
};

export const useCreateSavedSearch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: PlantFinderAnswers }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('saved_searches')
        .insert([{ 
          user_id: user.id, 
          name, 
          filters: filters as unknown as Json
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
    },
  });
};

export const useUpdateSavedSearch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('saved_searches')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
    },
  });
};

export const useDeleteSavedSearch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
    },
  });
};
