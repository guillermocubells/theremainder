-- Add garden profile fields to addresses table
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS is_garden_location boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS climate_zone text,
ADD COLUMN IF NOT EXISTS avg_annual_rainfall_mm integer,
ADD COLUMN IF NOT EXISTS sun_exposure text CHECK (sun_exposure IN ('full_sun', 'partial_shade', 'shade')),
ADD COLUMN IF NOT EXISTS soil_type text CHECK (soil_type IN ('sandy', 'loamy', 'clay', 'rocky', 'peat', 'mixed')),
ADD COLUMN IF NOT EXISTS drainage text CHECK (drainage IN ('fast', 'medium', 'poor')),
ADD COLUMN IF NOT EXISTS wind_exposure text CHECK (wind_exposure IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS altitude_m integer,
ADD COLUMN IF NOT EXISTS min_winter_temp_c integer,
ADD COLUMN IF NOT EXISTS humidity_level text CHECK (humidity_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS frost_frequency text CHECK (frost_frequency IN ('rare', 'occasional', 'frequent')),
ADD COLUMN IF NOT EXISTS soil_ph text CHECK (soil_ph IN ('acid', 'neutral', 'alkaline')),
ADD COLUMN IF NOT EXISTS garden_notes text;

-- Create table for active garden addresses (for recommendations)
CREATE TABLE IF NOT EXISTS public.active_garden_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, address_id)
);

-- Enable RLS
ALTER TABLE public.active_garden_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies for active_garden_addresses
CREATE POLICY "Users can view own active garden addresses" 
ON public.active_garden_addresses 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own active garden addresses" 
ON public.active_garden_addresses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own active garden addresses" 
ON public.active_garden_addresses 
FOR DELETE 
USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON COLUMN public.addresses.is_garden_location IS 'Indicates if this address has a garden for plant recommendations';
COMMENT ON COLUMN public.addresses.climate_zone IS 'USDA or Köppen climate zone';
COMMENT ON COLUMN public.addresses.avg_annual_rainfall_mm IS 'Average annual rainfall in millimeters';
COMMENT ON COLUMN public.addresses.sun_exposure IS 'Primary sun exposure: full_sun, partial_shade, shade';
COMMENT ON COLUMN public.addresses.soil_type IS 'Primary soil type: sandy, loamy, clay, rocky, peat, mixed';
COMMENT ON COLUMN public.addresses.drainage IS 'Soil drainage: fast, medium, poor';
COMMENT ON COLUMN public.addresses.wind_exposure IS 'Wind exposure level: low, medium, high';