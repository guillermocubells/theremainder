import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AuctionLotData {
  title: string;
  description: string;
  starting_price: number;
  reserve_price?: number;
  condition?: string;
  provenance?: string;
  dimensions?: { height?: string; width?: string; pot_size?: string; age_size?: string };
  plant_id?: string;
  images: string[];
  videos: string[];
  provenance_documents?: string[];
  // Extended PRD fields stored in meta_description/seller_notes JSON
  genus?: string;
  species?: string;
  cultivar?: string;
  common_name?: string;
  category?: string;
  tags?: string[];
  duration_hours?: number;
  location_country?: string;
  location_region?: string;
  shipping_eu_only?: boolean;
  excluded_countries?: string;
  shipping_cost?: number;
  shipping_tiers?: string;
  handling_time?: string;
  hardiness_zone?: string;
  humidity_tolerance?: string;
}

/**
 * Calculate the bid increment based on the PRD tiered ladder.
 */
export function calculateBidIncrement(currentPrice: number): number {
  if (currentPrice < 50) return 1;
  if (currentPrice < 200) return 5;
  if (currentPrice < 1000) return 10;
  return 50;
}

export function useAuctionSubmission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const submitLot = useMutation({
    mutationFn: async (lot: AuctionLotData) => {
      if (!user) throw new Error('Not authenticated');

      const slug = lot.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      // Store extended seller metadata in seller_notes as structured JSON
      const sellerMeta = {
        genus: lot.genus,
        species: lot.species,
        cultivar: lot.cultivar,
        common_name: lot.common_name,
        category: lot.category,
        tags: lot.tags,
        duration_hours: lot.duration_hours,
        location_country: lot.location_country,
        location_region: lot.location_region,
        shipping_eu_only: lot.shipping_eu_only,
        excluded_countries: lot.excluded_countries,
        shipping_cost: lot.shipping_cost,
        shipping_tiers: lot.shipping_tiers,
        handling_time: lot.handling_time,
        hardiness_zone: lot.hardiness_zone,
        humidity_tolerance: lot.humidity_tolerance,
      };

      const bidIncrement = calculateBidIncrement(lot.starting_price);

      const { data, error } = await supabase
        .from('auctions' as any)
        .insert({
          title: lot.title,
          slug,
          description: lot.description,
          starting_price: lot.starting_price,
          reserve_price: lot.reserve_price || null,
          buy_now_price: null, // Disabled for auctions per PRD
          bid_increment: bidIncrement,
          condition: lot.condition || null,
          provenance: lot.provenance || null,
          dimensions: lot.dimensions || {},
          plant_id: lot.plant_id || null,
          images: lot.images,
          videos: lot.videos,
          provenance_documents: lot.provenance_documents || [],
          created_by: user.id,
          seller_user_id: user.id,
          status: 'pending_review',
          current_price: lot.starting_price,
          seller_notes: JSON.stringify(sellerMeta),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['seller-auctions'] });
      toast.success('Lote enviado para revisión');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { submitLot };
}
