
-- =============================================
-- 1) RLS POLICIES FOR job_queue (BUG-003 Critical)
-- =============================================
-- Job queue should NOT be accessible by regular users via the API.
-- Only service_role (edge functions, triggers) should read/write.
-- We add a deny-all policy for anon/authenticated and rely on 
-- SECURITY DEFINER functions (enqueue_job, dequeue_jobs) for access.

CREATE POLICY "Deny direct access to job_queue"
  ON public.job_queue
  FOR ALL
  USING (false);

-- Also protect job_dead_letters
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_dead_letters') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'job_dead_letters' AND schemaname = 'public'
    ) THEN
      EXECUTE 'ALTER TABLE public.job_dead_letters ENABLE ROW LEVEL SECURITY';
      EXECUTE 'CREATE POLICY "Deny direct access to job_dead_letters" ON public.job_dead_letters FOR ALL USING (false)';
    END IF;
  END IF;
END $$;

-- =============================================
-- 2) IDEMPOTENCY IN place_bid VIA bids_idem (High)
-- =============================================
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_ip_address text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auction RECORD;
  v_min_bid NUMERIC;
  v_bid_id UUID;
  v_snipe_window INTERVAL;
  v_snipe_extension INTERVAL;
  v_existing_bid_id UUID;
BEGIN
  -- Idempotency check: if key provided and already used, return existing bid
  IF p_idempotency_key IS NOT NULL THEN
    SELECT bid_id INTO v_existing_bid_id
    FROM bids_idem
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_bid_id IS NOT NULL THEN
      RETURN v_existing_bid_id;
    END IF;
  END IF;

  -- Consent check
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

  -- Reject bids > 1s after end
  IF v_auction.ends_at IS NOT NULL AND now() > (v_auction.ends_at + interval '1 second') THEN
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

  -- Calculate minimum bid using tiered increment
  IF v_auction.total_bids = 0 THEN
    v_min_bid := v_auction.starting_price;
  ELSE
    v_min_bid := v_auction.current_price + v_auction.bid_increment;
  END IF;

  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid must be at least % €', v_min_bid;
  END IF;

  -- EUR only
  IF v_auction.currency != 'EUR' THEN
    RAISE EXCEPTION 'Only EUR bids are accepted';
  END IF;

  INSERT INTO bids (auction_id, user_id, amount, status, ip_address)
  VALUES (p_auction_id, p_user_id, p_amount, 'active', p_ip_address)
  RETURNING id INTO v_bid_id;

  -- Record idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO bids_idem (idempotency_key, bid_id)
    VALUES (p_idempotency_key, v_bid_id)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- Update auction state
  UPDATE auctions
  SET current_price = p_amount,
      total_bids = total_bids + 1,
      bid_increment = CASE
        WHEN p_amount < 50 THEN 1
        WHEN p_amount < 200 THEN 5
        WHEN p_amount < 1000 THEN 10
        ELSE 50
      END,
      reserve_met = CASE
        WHEN reserve_price IS NOT NULL AND p_amount >= reserve_price THEN true
        ELSE reserve_met
      END,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Anti-sniping
  v_snipe_window := make_interval(secs => COALESCE(v_auction.soft_close_window_sec, 120));
  v_snipe_extension := v_snipe_window;

  IF v_auction.ends_at IS NOT NULL
     AND v_auction.ends_at - now() < v_snipe_window THEN
    UPDATE auctions
    SET ends_at = ends_at + v_snipe_extension,
        updated_at = now()
    WHERE id = p_auction_id;
  END IF;

  RETURN v_bid_id;
END;
$function$;
