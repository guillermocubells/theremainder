-- =============================================
-- SPANISH INVOICING SYSTEM: B2C/B2B + RECTIFICATIVAS + VERI*FACTU
-- =============================================

-- 1) Invoice type enum
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('standard', 'rectificativa');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Customer type enum for orders
DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('b2c', 'b2b');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Add customer_type to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_type customer_type DEFAULT 'b2c';

-- 4) Invoice series table
CREATE TABLE IF NOT EXISTS public.invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  series_type TEXT NOT NULL CHECK (series_type IN ('b2c', 'b2b', 'rectificativa')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prefix, year)
);

-- 5) Add new columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_type invoice_type DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.invoice_series(id),
ADD COLUMN IF NOT EXISTS rectifies_invoice_id UUID REFERENCES public.invoices(id),
ADD COLUMN IF NOT EXISTS rectifies_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS rectification_reason TEXT,
ADD COLUMN IF NOT EXISTS customer_type customer_type DEFAULT 'b2c',
ADD COLUMN IF NOT EXISTS buyer_tax_id TEXT,
ADD COLUMN IF NOT EXISTS buyer_legal_name TEXT,
ADD COLUMN IF NOT EXISTS base_imponible NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 21.00,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS snapshot_hash TEXT;

-- 6) Invoice records table for VERI*FACTU immutable chain
CREATE TABLE IF NOT EXISTS public.invoice_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  invoice_number TEXT NOT NULL,
  invoice_type invoice_type NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL,
  issuer_nif TEXT,
  issuer_name TEXT,
  receiver_nif TEXT,
  receiver_name TEXT,
  base_imponible NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  record_sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for hash chain integrity
CREATE INDEX IF NOT EXISTS idx_invoice_records_sequence ON public.invoice_records(record_sequence);
CREATE INDEX IF NOT EXISTS idx_invoice_records_invoice ON public.invoice_records(invoice_id);

-- 7) Insert default series for 2026
INSERT INTO public.invoice_series (code, name, prefix, year, next_number, series_type)
VALUES 
  ('B2C-2026', 'Facturas B2C 2026', 'B2C', 2026, 1, 'b2c'),
  ('B2B-2026', 'Facturas B2B 2026', 'B2B', 2026, 1, 'b2b'),
  ('R-2026', 'Rectificativas 2026', 'R', 2026, 1, 'rectificativa')
ON CONFLICT (prefix, year) DO NOTHING;

-- 8) Function to generate invoice number from series
CREATE OR REPLACE FUNCTION public.generate_invoice_number_from_series(p_series_type TEXT)
RETURNS TABLE(invoice_number TEXT, series_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_series RECORD;
  v_number TEXT;
BEGIN
  -- Get active series for the type and current year
  SELECT s.id, s.prefix, s.year, s.next_number
  INTO v_series
  FROM invoice_series s
  WHERE s.series_type = p_series_type
    AND s.year = EXTRACT(YEAR FROM now())::INTEGER
    AND s.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  IF v_series IS NULL THEN
    RAISE EXCEPTION 'No active series found for type: %', p_series_type;
  END IF;
  
  -- Generate number: PREFIX-YEAR-XXXXXX
  v_number := v_series.prefix || '-' || v_series.year || '-' || lpad(v_series.next_number::TEXT, 6, '0');
  
  -- Increment counter
  UPDATE invoice_series 
  SET next_number = next_number + 1, updated_at = now()
  WHERE id = v_series.id;
  
  RETURN QUERY SELECT v_number, v_series.id;
END;
$$;

-- 9) Function to calculate hash for VERI*FACTU
CREATE OR REPLACE FUNCTION public.calculate_invoice_hash(
  p_invoice_number TEXT,
  p_issue_date TIMESTAMPTZ,
  p_issuer_nif TEXT,
  p_total NUMERIC,
  p_previous_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_data TEXT;
BEGIN
  -- Concatenate invoice data + previous hash
  v_data := COALESCE(p_invoice_number, '') || '|' ||
            COALESCE(to_char(p_issue_date, 'YYYY-MM-DD HH24:MI:SS'), '') || '|' ||
            COALESCE(p_issuer_nif, '') || '|' ||
            COALESCE(p_total::TEXT, '0') || '|' ||
            COALESCE(p_previous_hash, 'GENESIS');
  
  -- Return SHA-256 hash
  RETURN encode(sha256(v_data::bytea), 'hex');
END;
$$;

-- 10) Function to create invoice record with hash chain
CREATE OR REPLACE FUNCTION public.create_invoice_record(p_invoice_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice RECORD;
  v_previous RECORD;
  v_current_hash TEXT;
  v_sequence INTEGER;
  v_record_id UUID;
BEGIN
  -- Get invoice data
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;
  
  -- Get previous record for hash chain
  SELECT current_hash, record_sequence
  INTO v_previous
  FROM invoice_records
  ORDER BY record_sequence DESC
  LIMIT 1;
  
  v_sequence := COALESCE(v_previous.record_sequence, 0) + 1;
  
  -- Calculate hash
  v_current_hash := calculate_invoice_hash(
    v_invoice.invoice_number,
    v_invoice.issued_at,
    v_invoice.seller_tax_id,
    v_invoice.total_amount,
    v_previous.current_hash
  );
  
  -- Insert immutable record
  INSERT INTO invoice_records (
    invoice_id,
    invoice_number,
    invoice_type,
    issue_date,
    issuer_nif,
    issuer_name,
    receiver_nif,
    receiver_name,
    base_imponible,
    tax_rate,
    tax_amount,
    total_amount,
    currency,
    previous_hash,
    current_hash,
    record_sequence
  ) VALUES (
    p_invoice_id,
    v_invoice.invoice_number,
    v_invoice.invoice_type,
    v_invoice.issued_at,
    v_invoice.seller_tax_id,
    v_invoice.seller_name,
    v_invoice.buyer_tax_id,
    v_invoice.buyer_name,
    v_invoice.base_imponible,
    v_invoice.tax_rate,
    v_invoice.tax_amount,
    v_invoice.total_amount,
    v_invoice.currency,
    v_previous.current_hash,
    v_current_hash,
    v_sequence
  )
  RETURNING id INTO v_record_id;
  
  -- Update invoice with hash
  UPDATE invoices SET snapshot_hash = v_current_hash WHERE id = p_invoice_id;
  
  RETURN v_record_id;
END;
$$;

-- 11) Updated function to create Spanish invoice from order
CREATE OR REPLACE FUNCTION public.create_spanish_invoice_from_order(
  p_order_id UUID,
  p_invoice_type invoice_type DEFAULT 'standard',
  p_rectifies_invoice_id UUID DEFAULT NULL,
  p_rectification_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_subtotal NUMERIC;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_series_id UUID;
  v_series_type TEXT;
  v_customer_type customer_type;
  v_seller_name TEXT;
  v_seller_address TEXT;
  v_seller_tax_id TEXT;
  v_seller_email TEXT;
  v_base_imponible NUMERIC;
  v_tax_rate NUMERIC := 21.00;
  v_tax_amount NUMERIC;
  v_rectified_invoice RECORD;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Determine customer type
  v_customer_type := COALESCE(v_order.customer_type, 'b2c');
  
  -- Determine series type
  IF p_invoice_type = 'rectificativa' THEN
    v_series_type := 'rectificativa';
  ELSIF v_customer_type = 'b2b' THEN
    v_series_type := 'b2b';
  ELSE
    v_series_type := 'b2c';
  END IF;

  -- Check idempotency for standard invoices
  IF p_invoice_type = 'standard' THEN
    IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id AND invoice_type = 'standard') THEN
      SELECT id INTO v_invoice_id FROM invoices WHERE order_id = p_order_id AND invoice_type = 'standard';
      RETURN v_invoice_id;
    END IF;
  END IF;

  -- Get order items as JSON
  SELECT jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'product_id', oi.product_id,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'subtotal', oi.quantity * oi.unit_price
  ))
  INTO v_items
  FROM order_items oi
  WHERE oi.order_id = p_order_id;

  -- Calculate subtotal (base imponible)
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = p_order_id;

  -- For rectificativa, use negative amounts if full refund
  IF p_invoice_type = 'rectificativa' AND p_rectifies_invoice_id IS NOT NULL THEN
    SELECT * INTO v_rectified_invoice FROM invoices WHERE id = p_rectifies_invoice_id;
    
    -- Use refund amount from order if partial, otherwise full amount
    IF v_order.refund_amount IS NOT NULL AND v_order.refund_amount < v_order.total_amount THEN
      v_subtotal := -v_order.refund_amount * (100 / (100 + v_tax_rate));
    ELSE
      v_subtotal := -v_subtotal;
    END IF;
  END IF;

  -- Calculate tax
  v_base_imponible := v_subtotal;
  v_tax_amount := ROUND(v_base_imponible * (v_tax_rate / 100), 2);

  -- Get seller info from store_settings
  SELECT COALESCE((value->>'name')::text, 'Frondaprima')
  INTO v_seller_name
  FROM store_settings WHERE key = 'invoice_seller_info';
  
  SELECT COALESCE((value->>'address')::text, '')
  INTO v_seller_address
  FROM store_settings WHERE key = 'invoice_seller_info';
  
  SELECT COALESCE((value->>'tax_id')::text, '')
  INTO v_seller_tax_id
  FROM store_settings WHERE key = 'invoice_seller_info';
  
  SELECT COALESCE((value->>'email')::text, '')
  INTO v_seller_email
  FROM store_settings WHERE key = 'invoice_seller_info';

  v_seller_name := COALESCE(v_seller_name, 'Frondaprima');

  -- Generate invoice number from series
  SELECT invoice_number, series_id INTO v_invoice_number, v_series_id
  FROM generate_invoice_number_from_series(v_series_type);

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    order_id,
    user_id,
    invoice_type,
    series_id,
    customer_type,
    rectifies_invoice_id,
    rectifies_invoice_number,
    rectification_reason,
    seller_name,
    seller_address,
    seller_tax_id,
    seller_email,
    buyer_name,
    buyer_legal_name,
    buyer_email,
    buyer_tax_id,
    buyer_address,
    items,
    base_imponible,
    tax_rate,
    tax_amount,
    subtotal,
    shipping_cost,
    total_amount,
    currency,
    status,
    stripe_payment_intent_id
  ) VALUES (
    v_invoice_number,
    p_order_id,
    v_order.user_id,
    p_invoice_type,
    v_series_id,
    v_customer_type,
    p_rectifies_invoice_id,
    CASE WHEN v_rectified_invoice IS NOT NULL THEN v_rectified_invoice.invoice_number ELSE NULL END,
    p_rectification_reason,
    v_seller_name,
    v_seller_address,
    v_seller_tax_id,
    v_seller_email,
    COALESCE((v_order.shipping_address->>'full_name')::text, 'Cliente'),
    COALESCE((v_order.shipping_address->>'legal_name')::text, NULL),
    (SELECT email FROM profiles WHERE user_id = v_order.user_id LIMIT 1),
    COALESCE((v_order.shipping_address->>'tax_id')::text, NULL),
    v_order.shipping_address,
    COALESCE(v_items, '[]'::jsonb),
    v_base_imponible,
    v_tax_rate,
    v_tax_amount,
    ABS(v_base_imponible),
    CASE WHEN p_invoice_type = 'rectificativa' THEN 0 ELSE v_order.total_amount - v_subtotal END,
    v_base_imponible + v_tax_amount,
    'EUR',
    'issued',
    v_order.stripe_payment_intent_id
  )
  RETURNING id INTO v_invoice_id;

  -- Update order with invoice reference (only for standard invoices)
  IF p_invoice_type = 'standard' THEN
    UPDATE orders SET invoice_id = v_invoice_id WHERE id = p_order_id;
  END IF;

  -- Create immutable record with hash chain
  PERFORM create_invoice_record(v_invoice_id);

  RETURN v_invoice_id;
END;
$$;

-- 12) Update trigger to use new Spanish invoice function
CREATE OR REPLACE FUNCTION public.trigger_create_invoice_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create invoice when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM create_spanish_invoice_from_order(NEW.id, 'standard', NULL, NULL);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 13) RLS policies for new tables
ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_records ENABLE ROW LEVEL SECURITY;

-- Admin-only access for invoice_series
CREATE POLICY "Admin can manage invoice series"
ON public.invoice_series
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Admin-only access for invoice_records (read-only for auditing)
CREATE POLICY "Admin can view invoice records"
ON public.invoice_records
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Update invoices policy to include new fields access
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
ON public.invoices
FOR SELECT
USING (user_id = auth.uid());