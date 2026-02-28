
-- ═══════════════════════════════════════════════
-- 1. Climate zones reference table (USDA, Köppen, etc.)
-- ═══════════════════════════════════════════════
CREATE TABLE public.climate_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system TEXT NOT NULL CHECK (system IN ('usda','koppen','rhs','aha')),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  min_temp_c NUMERIC(5,1),
  max_temp_c NUMERIC(5,1),
  precipitation_mm_min INT,
  precipitation_mm_max INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system, code)
);

ALTER TABLE public.climate_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read climate zones"
  ON public.climate_zones FOR SELECT USING (true);

CREATE POLICY "Admins can manage climate zones"
  ON public.climate_zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- 2. Region overrides (country / lat-lon tile mappings)
-- ═══════════════════════════════════════════════
CREATE TABLE public.region_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  climate_zone_id UUID NOT NULL REFERENCES public.climate_zones(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  province TEXT,
  postal_prefix TEXT,
  lat_min NUMERIC(8,4),
  lat_max NUMERIC(8,4),
  lon_min NUMERIC(8,4),
  lon_max NUMERIC(8,4),
  altitude_min_m INT,
  altitude_max_m INT,
  local_label TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.region_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read region overrides"
  ON public.region_overrides FOR SELECT USING (true);

CREATE POLICY "Admins can manage region overrides"
  ON public.region_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════
CREATE INDEX idx_climate_zones_system_code ON public.climate_zones(system, code);
CREATE INDEX idx_region_overrides_zone ON public.region_overrides(climate_zone_id);
CREATE INDEX idx_region_overrides_country ON public.region_overrides(country_code);
CREATE INDEX idx_region_overrides_geo ON public.region_overrides(lat_min, lat_max, lon_min, lon_max);

-- Updated_at triggers
CREATE TRIGGER update_climate_zones_updated_at
  BEFORE UPDATE ON public.climate_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_region_overrides_updated_at
  BEFORE UPDATE ON public.region_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
