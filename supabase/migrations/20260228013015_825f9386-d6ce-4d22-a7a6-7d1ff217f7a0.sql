
-- ═══════════════════════════════════════════════
-- 1. Fit score cache (per user-address × plant)
-- ═══════════════════════════════════════════════
CREATE TABLE public.fit_score_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
  climate_zone_id UUID REFERENCES public.climate_zones(id) ON DELETE SET NULL,
  region_override_id UUID REFERENCES public.region_overrides(id) ON DELETE SET NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  factors JSONB DEFAULT '{}',
  stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id, address_id)
);

ALTER TABLE public.fit_score_cache ENABLE ROW LEVEL SECURITY;

-- Users read their own cached scores
CREATE POLICY "Users can read own fit scores"
  ON public.fit_score_cache FOR SELECT
  TO authenticated
  USING (
    address_id IN (SELECT id FROM public.addresses WHERE user_id = auth.uid())
  );

-- System/admin write
CREATE POLICY "Admins can manage fit scores"
  ON public.fit_score_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- 2. Materialized aggregate view (species × region)
-- ═══════════════════════════════════════════════
CREATE MATERIALIZED VIEW public.fit_score_agg AS
SELECT
  f.plant_id AS species_id,
  f.climate_zone_id AS region_id,
  ROUND(AVG(f.score), 2) AS avg_score,
  MIN(f.score) AS min_score,
  MAX(f.score) AS max_score,
  COUNT(*) AS sample_count,
  MAX(f.updated_at) AS updated_at
FROM public.fit_score_cache f
WHERE f.climate_zone_id IS NOT NULL
GROUP BY f.plant_id, f.climate_zone_id
WITH DATA;

CREATE UNIQUE INDEX idx_fit_score_agg_pk ON public.fit_score_agg(species_id, region_id);
CREATE INDEX idx_fit_score_agg_score ON public.fit_score_agg(avg_score DESC);

-- ═══════════════════════════════════════════════
-- Helper function to refresh the mat view
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.refresh_fit_score_agg()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.fit_score_agg;
$$;

-- ═══════════════════════════════════════════════
-- Indexes on cache table
-- ═══════════════════════════════════════════════
CREATE INDEX idx_fit_cache_plant ON public.fit_score_cache(plant_id);
CREATE INDEX idx_fit_cache_address ON public.fit_score_cache(address_id);
CREATE INDEX idx_fit_cache_zone ON public.fit_score_cache(climate_zone_id);
CREATE INDEX idx_fit_cache_stale ON public.fit_score_cache(stale) WHERE stale = true;

-- Updated_at trigger
CREATE TRIGGER update_fit_score_cache_updated_at
  BEFORE UPDATE ON public.fit_score_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
