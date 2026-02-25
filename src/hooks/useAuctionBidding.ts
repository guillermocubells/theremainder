import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface AuctionLive {
  id: string;
  current_price: number;
  total_bids: number;
  ends_at: string | null;
  bid_increment: number;
  starting_price: number;
  reserve_met: boolean;
  status: string;
}

export function useAuctionBidding(auctionId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);

  // Fetch auction state
  const { data: auction } = useQuery({
    queryKey: ['auction-live', auctionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions' as any)
        .select('id, current_price, total_bids, ends_at, bid_increment, starting_price, reserve_met, status')
        .eq('id', auctionId)
        .single();
      if (error) throw error;
      return data as unknown as AuctionLive;
    },
    refetchInterval: 10000, // fallback polling
  });

  // Fetch bid history
  const { data: bids } = useQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Bid[];
    },
    refetchInterval: 10000,
  });

  // Realtime subscriptions
  useEffect(() => {
    const auctionChannel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['auction-live', auctionId] });
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`bids-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [auctionId, queryClient]);

  // Countdown timer
  useEffect(() => {
    if (!auction?.ends_at) { setTimeLeft(''); return; }

    const tick = () => {
      const now = Date.now();
      const end = new Date(auction.ends_at!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Finalizada');
        setIsEnding(false);
        return;
      }

      setIsEnding(diff < 5 * 60 * 1000); // < 5 min

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s`);
      else setTimeLeft(`${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auction?.ends_at]);

  // Calculate min bid
  const minBid = auction
    ? auction.total_bids === 0
      ? auction.starting_price
      : auction.current_price + auction.bid_increment
    : 0;

  // Place bid mutation
  const placeBid = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Debes iniciar sesión para pujar');

      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auctionId,
        p_user_id: user.id,
        p_amount: amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction-live', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
      toast.success('¡Puja registrada!');
    },
    onError: (e: Error) => {
      const msg = e.message.replace(/^.*ERROR:\s*/, '');
      toast.error(msg);
    },
  });

  return {
    auction,
    bids: bids || [],
    timeLeft,
    isEnding,
    minBid,
    placeBid,
    isAuthenticated: !!user,
    userId: user?.id,
  };
}
