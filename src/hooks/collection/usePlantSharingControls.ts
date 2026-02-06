import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VisibilityInSharedLists = 'hidden' | 'visible';
export type AvailabilityIntent = 'not_open' | 'for_sale' | 'for_trade';
export type InquiryHandlingMode = 'allow' | 'muted' | 'blocked';

interface UpdateSharingControlsParams {
  plantId: string;
  visibility_in_shared_lists?: VisibilityInSharedLists;
  allow_inquiries?: boolean;
  availability_intent?: AvailabilityIntent;
  inquiry_handling_mode?: InquiryHandlingMode;
}

export const useUpdatePlantSharingControls = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plantId, ...updates }: UpdateSharingControlsParams) => {
      const { data, error } = await supabase
        .from('owned_plants')
        .update(updates as any)
        .eq('id', plantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['owned-plant', variables.plantId] });
      queryClient.invalidateQueries({ queryKey: ['owned-plants'] });
    },
    onError: () => {
      toast.error('Error al actualizar configuración de compartir');
    },
  });
};
