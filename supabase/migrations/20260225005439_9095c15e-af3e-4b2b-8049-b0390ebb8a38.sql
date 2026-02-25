
-- Table to track inventory reservations during checkout
CREATE TABLE public.stock_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stock_reservations_session ON public.stock_reservations(session_id);
CREATE INDEX idx_stock_reservations_status ON public.stock_reservations(status) WHERE status = 'active';
CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations(expires_at) WHERE status = 'active';
CREATE INDEX idx_stock_reservations_payment_intent ON public.stock_reservations(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- Only admins can read reservations (internal table)
CREATE POLICY "Admins can manage reservations"
  ON public.stock_reservations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to reserve stock atomically
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_plant_id UUID,
  p_quantity INTEGER,
  p_session_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Lock the plant row to prevent race conditions
  SELECT stock_qty INTO v_available
  FROM plants
  WHERE id = p_plant_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Plant not found: %', p_plant_id;
  END IF;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for plant %: available=%, requested=%', p_plant_id, v_available, p_quantity;
  END IF;

  -- Decrement stock
  UPDATE plants
  SET stock_qty = stock_qty - p_quantity, updated_at = now()
  WHERE id = p_plant_id;

  -- Create reservation record
  INSERT INTO stock_reservations (plant_id, quantity, session_id, user_id, status, expires_at)
  VALUES (p_plant_id, p_quantity, p_session_id, p_user_id, 'active', now() + (p_ttl_minutes || ' minutes')::interval)
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

-- Function to release a reservation (restore stock)
CREATE OR REPLACE FUNCTION public.release_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM stock_reservations
  WHERE id = p_reservation_id AND status = 'active'
  FOR UPDATE;

  IF v_res IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Restore stock
  UPDATE plants
  SET stock_qty = stock_qty + v_res.quantity, updated_at = now()
  WHERE id = v_res.plant_id;

  -- Mark released
  UPDATE stock_reservations
  SET status = 'released', updated_at = now()
  WHERE id = p_reservation_id;

  RETURN TRUE;
END;
$$;

-- Function to confirm a reservation (stock already deducted, just mark confirmed)
CREATE OR REPLACE FUNCTION public.confirm_reservation_by_session(p_session_id TEXT, p_payment_intent_id TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE stock_reservations
  SET status = 'confirmed',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      updated_at = now()
  WHERE session_id = p_session_id AND status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to release all reservations for a session
CREATE OR REPLACE FUNCTION public.release_reservations_by_session(p_session_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_res IN
    SELECT id, plant_id, quantity
    FROM stock_reservations
    WHERE session_id = p_session_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE plants SET stock_qty = stock_qty + v_res.quantity, updated_at = now() WHERE id = v_res.plant_id;
    UPDATE stock_reservations SET status = 'released', updated_at = now() WHERE id = v_res.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function to release all expired reservations (called by cron)
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_res IN
    SELECT id, plant_id, quantity
    FROM stock_reservations
    WHERE status = 'active' AND expires_at <= now()
    FOR UPDATE
  LOOP
    UPDATE plants SET stock_qty = stock_qty + v_res.quantity, updated_at = now() WHERE id = v_res.plant_id;
    UPDATE stock_reservations SET status = 'expired', updated_at = now() WHERE id = v_res.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
