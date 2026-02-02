import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlantRecommendation {
  plant_id: string;
  name: string;
  scientific_name: string | null;
  rank: number;
  score: number;
  fit_reasons: string[];
  compromises: string[];
  thumbnail_url: string | null;
  price: number;
}

export interface RecommendationFilters {
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

export interface RecommendationRequest {
  query?: string;
  filters?: RecommendationFilters;
  limit?: number;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: PlantRecommendation[];
  ranking_logic: string;
  filters_applied: Record<string, unknown>;
  total_candidates: number;
  no_good_fit: boolean;
  no_good_fit_reason?: string;
}

export const useRecommendPlants = () => {
  return useMutation({
    mutationFn: async (request: RecommendationRequest): Promise<RecommendationResponse> => {
      const { data, error } = await supabase.functions.invoke('recommend-plants', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to get recommendations');
      }

      return data as RecommendationResponse;
    },
  });
};
