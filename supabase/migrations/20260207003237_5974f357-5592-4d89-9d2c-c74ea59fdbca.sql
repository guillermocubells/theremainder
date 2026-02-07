
-- Table to cache exchange rates
CREATE TABLE public.currency_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'EUR',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Public read access (no auth needed to see rates)
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view currency rates"
  ON public.currency_rates FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage currency rates"
  ON public.currency_rates FOR ALL
  USING (auth.role() = 'service_role');
