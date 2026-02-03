-- Add Stripe reference fields to orders table for proper event tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS refund_id TEXT,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
ON public.orders(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Add partially_refunded status if not exists
DO $$
BEGIN
  -- Check if the value exists before trying to add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'partially_refunded' 
    AND enumtypid = 'public.order_status'::regtype
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'partially_refunded';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'failed' 
    AND enumtypid = 'public.order_status'::regtype
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'failed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'refunded' 
    AND enumtypid = 'public.order_status'::regtype
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'refunded';
  END IF;
END $$;

-- Add partially_refunded and refunded status to invoice_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'partially_refunded' 
    AND enumtypid = 'public.invoice_status'::regtype
  ) THEN
    ALTER TYPE public.invoice_status ADD VALUE 'partially_refunded';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'void' 
    AND enumtypid = 'public.invoice_status'::regtype
  ) THEN
    ALTER TYPE public.invoice_status ADD VALUE 'void';
  END IF;
END $$;

-- Add stripe_payment_intent_id to invoices for idempotency
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;

-- Create unique partial index for idempotency (only one invoice per payment intent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent 
ON public.invoices(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;