
-- =====================================================
-- 1. Helper: get current auction terms version
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_auction_terms_version()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (value #>> '{}')::text
  FROM store_settings
  WHERE key = 'auction_terms_version'
  LIMIT 1;
$$;

-- =====================================================
-- 2. Helper: check if user has accepted current terms
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_auction_consent(
  p_user_id uuid,
  p_consent_type text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auction_consents
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND terms_version = get_auction_terms_version()
  );
$$;

-- =====================================================
-- 3. Update place_bid to enforce bidder consent
-- =====================================================
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_min_bid NUMERIC;
  v_bid_id UUID;
  v_snipe_window INTERVAL := '5 minutes';
  v_snipe_extension INTERVAL := '5 minutes';
BEGIN
  -- *** CONSENT CHECK ***
  IF NOT has_auction_consent(p_user_id, 'bidder') THEN
    RAISE EXCEPTION 'Debes aceptar los términos de subasta antes de pujar';
  END IF;

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

-- =====================================================
-- 4. Trigger: enforce seller consent on auction creation
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_seller_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce on user-created auctions (not admin)
  IF NEW.seller_user_id IS NOT NULL
     AND NOT has_auction_consent(NEW.seller_user_id, 'seller') THEN
    RAISE EXCEPTION 'Debes aceptar los términos de venta antes de crear subastas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_seller_consent ON auctions;
CREATE TRIGGER trg_enforce_seller_consent
  BEFORE INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_seller_consent();
