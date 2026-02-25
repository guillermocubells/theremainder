
-- Add deposit_amount to auctions (configurable per auction, nullable = no deposit required)
ALTER TABLE public.auctions
ADD COLUMN deposit_amount numeric DEFAULT NULL;

-- Track bidder deposits
CREATE TABLE public.auction_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id uuid NOT NULL REFERENCES public.auctions(id),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id text NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'captured', 'released', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, user_id)
);

-- Enable RLS
ALTER TABLE public.auction_deposits ENABLE ROW LEVEL SECURITY;

-- Users can view own deposits
CREATE POLICY "Users can view own deposits"
ON public.auction_deposits FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all deposits
CREATE POLICY "Admins can manage deposits"
ON public.auction_deposits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert/update (edge function)
CREATE POLICY "Service role can manage deposits"
ON public.auction_deposits FOR ALL
USING (auth.role() = 'service_role');

-- Update place_bid to check deposit
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction RECORD;
  v_min_bid NUMERIC;
  v_bid_id UUID;
  v_snipe_window INTERVAL := '5 minutes';
  v_snipe_extension INTERVAL := '5 minutes';
  v_deposit_required BOOLEAN;
BEGIN
  -- Lock the auction row
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF v_auction.status != 'live' THEN
    RAISE EXCEPTION 'Auction is not live (status: %)', v_auction.status;
  END IF;

  IF v_auction.starts_at IS NOT NULL AND now() < v_auction.starts_at THEN
    RAISE EXCEPTION 'Auction has not started yet';
  END IF;

  IF v_auction.ends_at IS NOT NULL AND now() > v_auction.ends_at THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF v_auction.seller_user_id = p_user_id OR v_auction.created_by = p_user_id THEN
    RAISE EXCEPTION 'You cannot bid on your own auction';
  END IF;

  -- Check deposit requirement
  IF v_auction.deposit_amount IS NOT NULL AND v_auction.deposit_amount > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM auction_deposits
      WHERE auction_id = p_auction_id
        AND user_id = p_user_id
        AND status = 'held'
    ) THEN
      RAISE EXCEPTION 'Deposit required before bidding';
    END IF;
  END IF;

  -- Calculate minimum bid
  IF v_auction.total_bids = 0 THEN
    v_min_bid := v_auction.starting_price;
  ELSE
    v_min_bid := v_auction.current_price + v_auction.bid_increment;
  END IF;

  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid must be at least % €', v_min_bid;
  END IF;

  INSERT INTO bids (auction_id, user_id, amount, status, ip_address)
  VALUES (p_auction_id, p_user_id, p_amount, 'active', p_ip_address)
  RETURNING id INTO v_bid_id;

  UPDATE auctions
  SET current_price = p_amount,
      total_bids = total_bids + 1,
      reserve_met = CASE
        WHEN reserve_price IS NOT NULL AND p_amount >= reserve_price THEN true
        ELSE reserve_met
      END,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Anti-sniping
  IF v_auction.ends_at IS NOT NULL
     AND v_auction.ends_at - now() < v_snipe_window THEN
    UPDATE auctions
    SET ends_at = ends_at + v_snipe_extension,
        updated_at = now()
    WHERE id = p_auction_id;
  END IF;

  RETURN v_bid_id;
END;
$$;
