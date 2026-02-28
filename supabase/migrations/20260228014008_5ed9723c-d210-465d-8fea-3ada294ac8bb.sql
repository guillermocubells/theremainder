
-- Add versioning & moderation columns to species_care_profiles
ALTER TABLE public.species_care_profiles
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.species_care_profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add versioning & moderation columns to region_overrides
ALTER TABLE public.region_overrides
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.region_overrides(id),
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Index for version history lookups
CREATE INDEX IF NOT EXISTS idx_care_profiles_prev_version ON public.species_care_profiles(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_region_overrides_prev_version ON public.region_overrides(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_region_overrides_moderation ON public.region_overrides(moderation_status);
