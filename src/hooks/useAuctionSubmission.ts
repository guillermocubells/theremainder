import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AuctionLotData {
  title: string;
  description: string;
  starting_price: number;
  reserve_price?: number;
  buy_now_price?: number;
  bid_increment?: number;
  condition?: string;
  provenance?: string;
  dimensions?: { height?: string; width?: string; pot_size?: string };
  plant_id?: string;
  images: string[];
  videos: string[];
}

export function useAuctionSubmission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const submitLot = useMutation({
    mutationFn: async (lot: AuctionLotData) => {
      if (!user) throw new Error('Not authenticated');

      // Generate slug from title
      const slug = lot.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const { data, error } = await supabase
        .from('auctions' as any)
        .insert({
          title: lot.title,
          slug,
          description: lot.description,
          starting_price: lot.starting_price,
          reserve_price: lot.reserve_price || null,
          buy_now_price: lot.buy_now_price || null,
          bid_increment: lot.bid_increment || 1,
          condition: lot.condition || null,
          provenance: lot.provenance || null,
          dimensions: lot.dimensions || {},
          plant_id: lot.plant_id || null,
          images: lot.images,
          videos: lot.videos,
          created_by: user.id,
          seller_user_id: user.id,
          status: 'draft',
          current_price: lot.starting_price,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-auctions'] });
      toast.success('Lote enviado para revisión');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { submitLot };
}
