-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM ('issued', 'cancelled', 'refunded');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  
  -- Seller info (configurable via store_settings)
  seller_name TEXT NOT NULL,
  seller_address TEXT,
  seller_tax_id TEXT,
  seller_email TEXT,
  
  -- Buyer info
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_address JSONB,
  
  -- Invoice details
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Status
  status invoice_status NOT NULL DEFAULT 'issued',
  
  -- Timestamps
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add invoice reference to orders table
ALTER TABLE public.orders ADD COLUMN invoice_id UUID REFERENCES public.invoices(id);

-- Create index for faster lookups
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_issued_at ON public.invoices(issued_at DESC);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage invoices
CREATE POLICY "Admins can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
ON public.invoices
FOR SELECT
USING (user_id = auth.uid());

-- Function to generate sequential invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_number INT;
  new_invoice_number TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(invoice_number, '^FP-' || current_year || '-', ''), invoice_number)::INT
  ), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE 'FP-' || current_year || '-%';
  
  new_invoice_number := 'FP-' || current_year || '-' || lpad(next_number::text, 5, '0');
  
  RETURN new_invoice_number;
END;
$$;

-- Function to create invoice from order
CREATE OR REPLACE FUNCTION create_invoice_from_order(p_order_id UUID)
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
  v_seller_name TEXT;
  v_seller_address TEXT;
  v_seller_tax_id TEXT;
  v_seller_email TEXT;
BEGIN
  -- Check if invoice already exists for this order
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) THEN
    SELECT id INTO v_invoice_id FROM invoices WHERE order_id = p_order_id;
    RETURN v_invoice_id;
  END IF;

  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
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

  -- Calculate subtotal
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = p_order_id;

  -- Get seller info from store_settings (with defaults)
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

  -- Use defaults if not configured
  v_seller_name := COALESCE(v_seller_name, 'Frondaprima');

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    order_id,
    user_id,
    seller_name,
    seller_address,
    seller_tax_id,
    seller_email,
    buyer_name,
    buyer_email,
    buyer_address,
    items,
    subtotal,
    shipping_cost,
    total_amount,
    currency,
    status
  ) VALUES (
    v_invoice_number,
    p_order_id,
    v_order.user_id,
    v_seller_name,
    v_seller_address,
    v_seller_tax_id,
    v_seller_email,
    COALESCE((v_order.shipping_address->>'full_name')::text, 'Cliente'),
    (SELECT email FROM profiles WHERE user_id = v_order.user_id LIMIT 1),
    v_order.shipping_address,
    COALESCE(v_items, '[]'::jsonb),
    v_subtotal,
    v_order.total_amount - v_subtotal,
    v_order.total_amount,
    'EUR',
    'issued'
  )
  RETURNING id INTO v_invoice_id;

  -- Update order with invoice reference
  UPDATE orders SET invoice_id = v_invoice_id WHERE id = p_order_id;

  RETURN v_invoice_id;
END;
$$;

-- Trigger function to auto-create invoice when order is paid
CREATE OR REPLACE FUNCTION trigger_create_invoice_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create invoice when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM create_invoice_from_order(NEW.id);
  END IF;
  
  -- Handle cancellation/refund
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE invoices 
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE order_id = NEW.id AND status = 'issued';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_order_status_change_create_invoice
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION trigger_create_invoice_on_paid();

-- Also trigger on insert if order is created with paid status
CREATE TRIGGER on_order_insert_create_invoice
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'paid')
EXECUTE FUNCTION trigger_create_invoice_on_paid();

-- Insert default seller settings if not exists
INSERT INTO store_settings (key, value, is_public, description)
VALUES (
  'invoice_seller_info',
  '{"name": "Frondaprima", "address": "", "tax_id": "", "email": ""}'::jsonb,
  false,
  'Información del vendedor para facturas'
)
ON CONFLICT (key) DO NOTHING;