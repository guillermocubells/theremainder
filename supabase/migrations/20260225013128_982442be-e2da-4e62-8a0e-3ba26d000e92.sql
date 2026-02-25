
-- Seller profiles for KYC / Stripe Connect
CREATE TABLE public.seller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Identity
  legal_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'nif', -- nif, dni, nie, cif
  document_number TEXT NOT NULL,
  -- Tax info
  tax_id TEXT, -- NIF/CIF for invoicing
  tax_address_street TEXT,
  tax_address_city TEXT,
  tax_address_postal_code TEXT,
  tax_address_province TEXT,
  tax_address_country TEXT DEFAULT 'ES',
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  -- Verification status
  verification_status TEXT NOT NULL DEFAULT 'not_started', -- not_started, pending, verified, rejected
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view/manage own seller profile
CREATE POLICY "Users can view own seller profile"
  ON public.seller_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own seller profile"
  ON public.seller_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own seller profile"
  ON public.seller_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage all
CREATE POLICY "Admins can manage seller profiles"
  ON public.seller_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add lot-specific fields to auctions table
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provenance TEXT,
  ADD COLUMN IF NOT EXISTS provenance_documents TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS seller_user_id UUID,
  ADD COLUMN IF NOT EXISTS seller_notes TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
