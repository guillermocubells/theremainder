
-- ═══════════════════════════════════════════════
-- Additional performance indexes, FKs, and constraints
-- for hazards/climate/care/fit tables
-- ═══════════════════════════════════════════════

-- 1. Partial indexes for active/approved profiles
CREATE INDEX idx_care_notes_approved
  ON public.care_notes(care_profile_id, locale)
  WHERE moderation_status = 'approved';

CREATE INDEX idx_care_profiles_approved
  ON public.species_care_profiles(plant_id)
  WHERE moderation_status = 'approved';

CREATE INDEX idx_region_overrides_active
  ON public.region_overrides(climate_zone_id, country_code)
  WHERE is_active = true;

CREATE INDEX idx_fit_cache_fresh
  ON public.fit_score_cache(plant_id, climate_zone_id, score DESC)
  WHERE stale = false;

-- 2. Composite indexes for common query patterns
CREATE INDEX idx_care_notes_profile_locale_cat
  ON public.care_notes(care_profile_id, locale, category);

CREATE INDEX idx_care_notes_region_verified
  ON public.care_notes(country_code, climate_zone_code)
  WHERE region_verified = true;

CREATE INDEX idx_watering_stress_zone_season
  ON public.watering_stress_thresholds(climate_zone, season, plant_id);

CREATE INDEX idx_fit_cache_score_desc
  ON public.fit_score_cache(address_id, score DESC);

-- 3. FK from care_notes to climate_zones (soft link via code)
-- Already have climate_zone_code as TEXT; add index for join performance
CREATE INDEX idx_care_notes_climate_zone_code
  ON public.care_notes(climate_zone_code);

-- 4. Constraint: score range on fit_score_agg refresh is inherent from source table
-- Add NOT NULL constraint on critical columns that should never be null
ALTER TABLE public.care_notes ALTER COLUMN body SET NOT NULL;
ALTER TABLE public.care_notes ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.care_notes ALTER COLUMN author_id SET NOT NULL;

-- 5. Covering index for fit_score_cache lookups with score
CREATE INDEX idx_fit_cache_plant_zone_score
  ON public.fit_score_cache(plant_id, climate_zone_id) INCLUDE (score, updated_at);
