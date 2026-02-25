
-- Atomic stock increment with row-level lock (used by refund restock)
CREATE OR REPLACE FUNCTION public.increment_stock(p_plant_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE plants
  SET stock_qty = stock_qty + p_quantity, updated_at = now()
  WHERE id = p_plant_id;

  IF NOT FOUND THEN
    RAISE WARNING '[increment_stock] Plant not found: %', p_plant_id;
  END IF;
END;
$function$;

-- Atomic stock decrement with oversell detection
-- Returns the new stock_qty; negative means oversold
CREATE OR REPLACE FUNCTION public.decrement_stock(p_plant_id uuid, p_quantity integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_qty integer;
BEGIN
  UPDATE plants
  SET stock_qty = stock_qty - p_quantity, updated_at = now()
  WHERE id = p_plant_id
  RETURNING stock_qty INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plant not found: %', p_plant_id;
  END IF;

  RETURN v_new_qty;
END;
$function$;

-- Table for oversell alerts so admins can take compensating action
CREATE TABLE IF NOT EXISTS public.oversell_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id uuid NOT NULL REFERENCES plants(id),
  order_id uuid REFERENCES orders(id),
  expected_stock integer NOT NULL,
  actual_stock integer NOT NULL,
  deficit integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oversell_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can see/manage oversell alerts
CREATE POLICY "Admins can manage oversell alerts"
  ON public.oversell_alerts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
