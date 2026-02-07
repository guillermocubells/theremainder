-- Add USDA hardiness zones as a separate field from climate zones
-- climate_zones = climate type (tropical, mediterraneo, atlantico, etc.)
-- hardiness_zones = USDA zones (9a, 10b, 11a, etc.)
ALTER TABLE public.plants 
ADD COLUMN IF NOT EXISTS hardiness_zones text[] DEFAULT '{}'::text[];

-- Add index for filtering by hardiness zones
CREATE INDEX IF NOT EXISTS idx_plants_hardiness_zones ON public.plants USING GIN(hardiness_zones);

COMMENT ON COLUMN public.plants.hardiness_zones IS 'USDA hardiness zones (e.g., 9a, 10b, 11a)';
COMMENT ON COLUMN public.plants.climate_zones IS 'Climate type zones (e.g., tropical, mediterraneo, atlantico)';