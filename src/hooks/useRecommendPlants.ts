import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============ INPUT TYPES ============
export interface RecommendFilters {
  exposure?: string[];
  water?: 'low' | 'medium' | 'high';
  humidity?: 'low' | 'medium' | 'high';
  climate_zones?: string[];
  min_temp_c?: number;
  plant_type?: string[];
  difficulty?: 'easy' | 'intermediate' | 'advanced';
  growth_rate?: 'slow' | 'medium' | 'fast';
  plant_use?: string[];
  rarity?: 'low' | 'medium' | 'high';
  price_max?: number;
  is_in_stock?: boolean;
}

export interface CatalogPlant {
  id: string;
  name: string;
  scientific_name?: string | null;
  plant_type?: string | null;
  exposure?: string[] | null;
  growth_rate?: string | null;
  climate_zones?: string[] | null;
  min_temp_c?: number | null;
  water?: string | null;
  humidity?: string | null;
  plant_use?: string[] | null;
  rarity?: string | null;
  difficulty?: string | null;
  is_in_stock?: boolean | null;
  price?: number;
  thumbnail_url?: string | null;
}

export interface RecommendInput {
  user_prompt?: string;
  filters?: RecommendFilters;
  catalog_subset?: CatalogPlant[];
}

// ============ OUTPUT TYPES ============
export interface PlantRecommendation {
  plant_id: string;
  fit_score: number;
  reasoning: string;
  tradeoffs: string;
}

export interface RecommendOutput {
  recommendations: PlantRecommendation[];
  confidence: 'low' | 'medium' | 'high';
  no_good_match: boolean;
}

export const useRecommendPlants = () => {
  return useMutation({
    mutationFn: async (input: RecommendInput): Promise<RecommendOutput> => {
      const { data, error } = await supabase.functions.invoke('recommend-plants', {
        body: input,
      });

      if (error) {
        throw new Error(error.message || 'Failed to get recommendations');
      }

      return data as RecommendOutput;
    },
  });
};
