
-- ═══════════════════════════════════════════════
-- 1. Species care profiles (canonical care data per plant)
-- ═══════════════════════════════════════════════
CREATE TABLE public.species_care_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  watering_frequency TEXT,
  watering_notes TEXT,
  fertilizing_frequency TEXT,
  fertilizing_notes TEXT,
  pruning_season TEXT,
  pruning_notes TEXT,
  repotting_frequency TEXT,
  repotting_notes TEXT,
  ideal_temp_min_c NUMERIC(5,1),
  ideal_temp_max_c NUMERIC(5,1),
  ideal_humidity_pct_min INT,
  ideal_humidity_pct_max INT,
  preferred_soil_type TEXT,
  preferred_soil_ph TEXT CHECK (preferred_soil_ph IS NULL OR preferred_soil_ph IN ('acid','neutral','alkaline','any')),
  light_requirement TEXT CHECK (light_requirement IS NULL OR light_requirement IN ('full_sun','partial_shade','shade','indirect','any')),
  dormancy_period TEXT,
  propagation_methods TEXT[],
  common_pests TEXT[],
  common_diseases TEXT[],
  companion_plants UUID[],
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('draft','pending','approved','rejected')),
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id)
);

ALTER TABLE public.species_care_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read care profiles"
  ON public.species_care_profiles FOR SELECT USING (true);

CREATE POLICY "Admins can manage care profiles"
  ON public.species_care_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- 2. Care notes (region-verified, locale-aware, community)
-- ═══════════════════════════════════════════════
CREATE TABLE public.care_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  care_profile_id UUID NOT NULL REFERENCES public.species_care_profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  locale TEXT NOT NULL DEFAULT 'es',
  category TEXT NOT NULL CHECK (category IN ('watering','fertilizing','pruning','repotting','pests','diseases','general','seasonal','propagation')),
  title TEXT,
  body TEXT NOT NULL,
  region_verified BOOLEAN NOT NULL DEFAULT false,
  country_code TEXT,
  climate_zone_code TEXT,
  hardiness_zone TEXT,
  season TEXT CHECK (season IS NULL OR season IN ('spring','summer','autumn','winter','all')),
  source_url TEXT,
  source_title TEXT,
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('scientific_paper','book','nursery','personal_experience','community','official_guide')),
  upvote_count INT NOT NULL DEFAULT 0,
  downvote_count INT NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','flagged')),
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;

-- Public read for approved notes
CREATE POLICY "Anyone can read approved care notes"
  ON public.care_notes FOR SELECT
  USING (moderation_status = 'approved');

-- Authors can see their own (any status)
CREATE POLICY "Authors can read own care notes"
  ON public.care_notes FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- Authenticated users can insert
CREATE POLICY "Authenticated users can create care notes"
  ON public.care_notes FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Authors can update own pending/rejected notes
CREATE POLICY "Authors can update own care notes"
  ON public.care_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND moderation_status IN ('pending','rejected'));

-- Admins full access
CREATE POLICY "Admins can manage care notes"
  ON public.care_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════
CREATE INDEX idx_care_profiles_plant ON public.species_care_profiles(plant_id);
CREATE INDEX idx_care_notes_profile ON public.care_notes(care_profile_id);
CREATE INDEX idx_care_notes_author ON public.care_notes(author_id);
CREATE INDEX idx_care_notes_locale ON public.care_notes(locale);
CREATE INDEX idx_care_notes_region ON public.care_notes(country_code, climate_zone_code);
CREATE INDEX idx_care_notes_moderation ON public.care_notes(moderation_status);

-- Updated_at triggers
CREATE TRIGGER update_species_care_profiles_updated_at
  BEFORE UPDATE ON public.species_care_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_care_notes_updated_at
  BEFORE UPDATE ON public.care_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
