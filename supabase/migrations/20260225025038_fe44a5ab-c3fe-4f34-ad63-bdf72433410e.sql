
-- Auction terms consent tracking
CREATE TABLE public.auction_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('bidder', 'seller')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One consent per user per version per type
CREATE UNIQUE INDEX uq_auction_consent_user_version_type
  ON public.auction_consents (user_id, terms_version, consent_type);

-- Index for quick lookups
CREATE INDEX idx_auction_consents_user ON public.auction_consents (user_id, consent_type);

ALTER TABLE public.auction_consents ENABLE ROW LEVEL SECURITY;

-- Users can view own consents
CREATE POLICY "Users can view own auction consents"
  ON public.auction_consents FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own consents
CREATE POLICY "Users can insert own auction consents"
  ON public.auction_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all auction consents"
  ON public.auction_consents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role can manage auction consents"
  ON public.auction_consents FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Store current terms version in store_settings
INSERT INTO public.store_settings (key, value, description, is_public)
VALUES (
  'auction_terms_version',
  '"1.0"'::jsonb,
  'Current version of auction terms & conditions',
  true
) ON CONFLICT DO NOTHING;

-- Helper function: check if user has accepted current auction terms
CREATE OR REPLACE FUNCTION public.has_auction_consent(
  p_user_id uuid,
  p_consent_type text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.auction_consents ac
    JOIN public.store_settings ss ON ss.key = 'auction_terms_version'
    WHERE ac.user_id = p_user_id
      AND ac.consent_type = p_consent_type
      AND ac.terms_version = ss.value #>> '{}'
  )
$$;
