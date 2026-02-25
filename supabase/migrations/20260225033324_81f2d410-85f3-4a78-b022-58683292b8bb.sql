
-- 1. Add missing columns to seller_profiles
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS seller_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS kyc_ref text,
  ADD COLUMN IF NOT EXISTS kyc_checked_at timestamptz;

-- 2. Add soft_close_window_sec to auctions (default 120 = 2 min per PRD)
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS soft_close_window_sec integer NOT NULL DEFAULT 120;

-- 3. Add ua_hash to bids
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS ua_hash text;

-- 4. Add 'closed' to auction_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'auction_status')) THEN
    ALTER TYPE auction_status ADD VALUE 'closed';
  END IF;
END $$;

-- 5. Create increment_schemas table
CREATE TABLE IF NOT EXISTS public.increment_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tiers_json jsonb NOT NULL DEFAULT '[{"up_to":4999,"increment":100},{"up_to":19999,"increment":500},{"up_to":99999,"increment":1000},{"increment":5000}]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.increment_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage increment schemas" ON public.increment_schemas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view increment schemas" ON public.increment_schemas FOR SELECT USING (true);

-- Insert default schema
INSERT INTO public.increment_schemas (name, tiers_json) VALUES (
  'default',
  '[{"up_to_cents":4999,"increment_cents":100},{"up_to_cents":19999,"increment_cents":500},{"up_to_cents":99999,"increment_cents":1000},{"increment_cents":5000}]'
) ON CONFLICT DO NOTHING;

-- 6. Create bids_idem table for idempotency
CREATE TABLE IF NOT EXISTS public.bids_idem (
  idempotency_key text PRIMARY KEY,
  bid_id uuid NOT NULL REFERENCES public.bids(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bids_idem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages bids_idem" ON public.bids_idem FOR ALL USING (auth.role() = 'service_role'::text);

-- 7. Create events table for audit event log
CREATE TABLE IF NOT EXISTS public.auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage auction events" ON public.auction_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages auction events" ON public.auction_events FOR ALL USING (auth.role() = 'service_role'::text);

-- 8. Create audit trigger for bids
CREATE OR REPLACE FUNCTION public.audit_bid_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, actor_id, new_data, ip_address, checksum)
  VALUES (
    'bid_placed',
    'bid',
    NEW.id,
    NEW.user_id,
    jsonb_build_object('amount', NEW.amount, 'auction_id', NEW.auction_id),
    NEW.ip_address,
    md5(NEW.id::text || NEW.amount::text || NEW.created_at::text)
  );
  
  -- Also emit event
  INSERT INTO auction_events (event_type, entity, entity_id, payload)
  VALUES ('bid.placed', 'bid', NEW.id, jsonb_build_object('auction_id', NEW.auction_id, 'amount', NEW.amount, 'user_id', NEW.user_id));
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bid_insert ON public.bids;
CREATE TRIGGER trg_audit_bid_insert
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bid_insert();

-- 9. Create audit trigger for auction status changes
CREATE OR REPLACE FUNCTION public.audit_auction_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, old_data, new_data, checksum)
    VALUES (
      'auction_status_changed',
      'auction',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      md5(NEW.id::text || NEW.status || now()::text)
    );
    
    INSERT INTO auction_events (event_type, entity, entity_id, payload)
    VALUES ('auction.updated', 'auction', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  
  -- Emit event on price change (new bid)
  IF OLD.current_price IS DISTINCT FROM NEW.current_price THEN
    INSERT INTO auction_events (event_type, entity, entity_id, payload)
    VALUES ('auction.price_updated', 'auction', NEW.id, jsonb_build_object('price', NEW.current_price, 'total_bids', NEW.total_bids));
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_auction_update ON public.auctions;
CREATE TRIGGER trg_audit_auction_update
  AFTER UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_auction_update();

-- 10. Create audit trigger for settlements
CREATE OR REPLACE FUNCTION public.audit_settlement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, new_data, checksum)
  VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'settlement_created' ELSE 'settlement_updated' END,
    'settlement',
    NEW.id,
    jsonb_build_object('status', NEW.status, 'hammer_price', NEW.hammer_price, 'platform_fee', NEW.platform_fee_amount, 'payout', NEW.seller_payout_amount),
    md5(NEW.id::text || NEW.status || now()::text)
  );
  
  INSERT INTO auction_events (event_type, entity, entity_id, payload)
  VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'settlement.created' ELSE 'settlement.updated' END,
    'settlement', NEW.id,
    jsonb_build_object('auction_id', NEW.auction_id, 'status', NEW.status)
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_settlement ON public.auction_settlements;
CREATE TRIGGER trg_audit_settlement
  AFTER INSERT OR UPDATE ON public.auction_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_settlement_change();

-- 11. Update place_bid to use auction's soft_close_window_sec instead of hardcoded 5min
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_min_bid NUMERIC;
  v_bid_id UUID;
  v_snipe_window INTERVAL;
  v_snipe_extension INTERVAL;
BEGIN
  -- Consent check
  IF NOT has_auction_consent(p_user_id, 'bidder') THEN
    RAISE EXCEPTION 'Debes aceptar los términos de subasta antes de pujar';
  END IF;

  -- Lock the auction row (SERIALIZABLE-like via FOR UPDATE)
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

  -- Reject bids > 1s after end (PRD: reject late bids >1s after end_at)
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

  -- Update auction: price, bid count, reserve check, recalculate bid_increment for next bid
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

  -- Anti-sniping: use auction's configurable soft_close_window_sec (default 120s = 2min)
  v_snipe_window := make_interval(secs => COALESCE(v_auction.soft_close_window_sec, 120));
  v_snipe_extension := v_snipe_window; -- extend by same amount

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

-- 12. Create close_ended_auctions function for cron
CREATE OR REPLACE FUNCTION public.close_ended_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_auction RECORD;
BEGIN
  FOR v_auction IN
    SELECT id, reserve_met, total_bids, reserve_price
    FROM auctions
    WHERE status = 'live'
      AND ends_at IS NOT NULL
      AND ends_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_auction.total_bids = 0 OR (v_auction.reserve_price IS NOT NULL AND NOT v_auction.reserve_met) THEN
      -- No bids or reserve not met → ended (unsold)
      UPDATE auctions SET status = 'ended', updated_at = now() WHERE id = v_auction.id;
    ELSE
      -- Has winning bid with reserve met → ended (pending settlement)
      UPDATE auctions SET status = 'ended', updated_at = now() WHERE id = v_auction.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
