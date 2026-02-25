
-- Settlement tracking table for auction closings
CREATE TABLE public.auction_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id),
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  winning_bid_id UUID NOT NULL REFERENCES public.bids(id),
  
  -- Amounts
  hammer_price NUMERIC NOT NULL,          -- winning bid amount
  platform_fee_rate NUMERIC NOT NULL DEFAULT 0.06,  -- 6%
  platform_fee_amount NUMERIC NOT NULL,   -- hammer_price * fee_rate
  seller_payout_amount NUMERIC NOT NULL,  -- hammer_price - fee
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Deposit handling
  deposit_amount NUMERIC DEFAULT 0,
  deposit_deducted BOOLEAN NOT NULL DEFAULT false,
  
  -- Invoice & order references
  order_id UUID REFERENCES public.orders(id),
  invoice_id UUID REFERENCES public.invoices(id),
  
  -- Stripe payout
  stripe_payment_intent_id TEXT,          -- buyer payment
  stripe_transfer_id TEXT,               -- transfer to seller Connect account
  stripe_charge_id TEXT,
  
  -- Status workflow: pending → buyer_charged → seller_paid → completed / failed
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  
  CONSTRAINT unique_auction_settlement UNIQUE (auction_id)
);

-- Enable RLS
ALTER TABLE public.auction_settlements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all settlements"
  ON public.auction_settlements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can view own settlements"
  ON public.auction_settlements FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Sellers can view own settlements"
  ON public.auction_settlements FOR SELECT
  USING (auth.uid() = seller_user_id);

CREATE POLICY "Service role can manage settlements"
  ON public.auction_settlements FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_auction_settlements_updated_at
  BEFORE UPDATE ON public.auction_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
