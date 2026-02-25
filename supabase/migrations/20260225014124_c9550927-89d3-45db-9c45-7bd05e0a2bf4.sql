
-- Concurrency-safe bid placement with increment validation and anti-sniping
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
BEGIN
  -- Lock the auction row to prevent race conditions
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  -- Must be live
  IF v_auction.status != 'live' THEN
    RAISE EXCEPTION 'Auction is not live (status: %)', v_auction.status;
  END IF;

  -- Check timing
  IF v_auction.starts_at IS NOT NULL AND now() < v_auction.starts_at THEN
    RAISE EXCEPTION 'Auction has not started yet';
  END IF;

  IF v_auction.ends_at IS NOT NULL AND now() > v_auction.ends_at THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  -- Seller cannot bid on own auction
  IF v_auction.seller_user_id = p_user_id OR v_auction.created_by = p_user_id THEN
    RAISE EXCEPTION 'You cannot bid on your own auction';
  END IF;

  -- Calculate minimum bid
  IF v_auction.total_bids = 0 THEN
    v_min_bid := v_auction.starting_price;
  ELSE
    v_min_bid := v_auction.current_price + v_auction.bid_increment;
  END IF;

  -- Validate bid amount
  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid must be at least % €', v_min_bid;
  END IF;

  -- Insert the bid
  INSERT INTO bids (auction_id, user_id, amount, status, ip_address)
  VALUES (p_auction_id, p_user_id, p_amount, 'active', p_ip_address)
  RETURNING id INTO v_bid_id;

  -- Update auction: current_price, total_bids, reserve_met
  UPDATE auctions
  SET current_price = p_amount,
      total_bids = total_bids + 1,
      reserve_met = CASE
        WHEN reserve_price IS NOT NULL AND p_amount >= reserve_price THEN true
        ELSE reserve_met
      END,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Anti-sniping: if bid placed within last 5 minutes, extend end time
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

-- Enable realtime for live bidding updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
