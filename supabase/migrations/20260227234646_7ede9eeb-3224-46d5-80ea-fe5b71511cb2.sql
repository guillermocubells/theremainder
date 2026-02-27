
-- Cache table for AI plant identification results
CREATE TABLE public.plant_ai_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  scientific_name TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'llm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Index for lookups
CREATE INDEX idx_plant_ai_cache_hash ON public.plant_ai_cache(query_hash);
CREATE INDEX idx_plant_ai_cache_expires ON public.plant_ai_cache(expires_at);

-- Enable RLS
ALTER TABLE public.plant_ai_cache ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role) can read/write
CREATE POLICY "Service role full access on plant_ai_cache"
  ON public.plant_ai_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
