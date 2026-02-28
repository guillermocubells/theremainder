
-- ═══════════════════════════════════════════════
-- 1. Species climate thresholds (frost & heat)
-- ═══════════════════════════════════════════════
CREATE TABLE public.species_climate_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  min_temp_c NUMERIC(5,1),          -- absolute frost kill threshold
  frost_warning_temp_c NUMERIC(5,1), -- trigger frost alert
  max_temp_c NUMERIC(5,1),          -- heat stress ceiling
  heat_warning_temp_c NUMERIC(5,1), -- trigger heat alert
  hardiness_zone_min TEXT,           -- e.g. '8a'
  hardiness_zone_max TEXT,           -- e.g. '11b'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id)
);

ALTER TABLE public.species_climate_thresholds ENABLE ROW LEVEL SECURITY;

-- Public read (catalog data)
CREATE POLICY "Anyone can read climate thresholds"
  ON public.species_climate_thresholds FOR SELECT
  USING (true);

-- Admin write
CREATE POLICY "Admins can manage climate thresholds"
  ON public.species_climate_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- 2. Toxicity / pet warnings
-- ═══════════════════════════════════════════════
CREATE TABLE public.toxicity_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  toxic_to_pets BOOLEAN NOT NULL DEFAULT false,
  toxic_to_children BOOLEAN NOT NULL DEFAULT false,
  toxic_to_humans BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe','lethal')),
  toxic_parts TEXT[],                -- e.g. {'leaves','sap','roots'}
  symptoms TEXT,                     -- description of effects
  first_aid TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id)
);

ALTER TABLE public.toxicity_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read toxicity warnings"
  ON public.toxicity_warnings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage toxicity warnings"
  ON public.toxicity_warnings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- 3. Watering stress thresholds per species+region
-- ═══════════════════════════════════════════════
CREATE TABLE public.watering_stress_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  climate_zone TEXT,                 -- NULL = global default for species
  season TEXT CHECK (season IN ('spring','summer','autumn','winter','all')),
  min_days_between_watering INT,     -- under-watering stress starts
  max_days_between_watering INT,     -- over-watering stress starts
  ideal_soil_moisture_pct NUMERIC(5,2),
  drought_tolerance TEXT CHECK (drought_tolerance IN ('none','low','moderate','high','extreme')),
  overwater_sensitivity TEXT CHECK (overwater_sensitivity IN ('none','low','moderate','high','extreme')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id, climate_zone, season)
);

ALTER TABLE public.watering_stress_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read watering thresholds"
  ON public.watering_stress_thresholds FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage watering thresholds"
  ON public.watering_stress_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════
CREATE INDEX idx_climate_thresholds_plant ON public.species_climate_thresholds(plant_id);
CREATE INDEX idx_toxicity_plant ON public.toxicity_warnings(plant_id);
CREATE INDEX idx_watering_plant_zone ON public.watering_stress_thresholds(plant_id, climate_zone);

-- Updated_at triggers
CREATE TRIGGER update_species_climate_thresholds_updated_at
  BEFORE UPDATE ON public.species_climate_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_toxicity_warnings_updated_at
  BEFORE UPDATE ON public.toxicity_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_watering_stress_thresholds_updated_at
  BEFORE UPDATE ON public.watering_stress_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
