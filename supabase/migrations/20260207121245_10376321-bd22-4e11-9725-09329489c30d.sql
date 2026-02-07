
-- Add missing botanical and logistics columns to plants table
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS weight_grams integer;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS family text;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS variety text;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS image_alt_text text;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS reference_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.plants.weight_grams IS 'Weight in grams for dynamic shipping calculation';
COMMENT ON COLUMN public.plants.family IS 'Botanical family (e.g. Arecaceae)';
COMMENT ON COLUMN public.plants.variety IS 'Cultivar or variety name';
COMMENT ON COLUMN public.plants.image_alt_text IS 'SEO alt text for product images';
COMMENT ON COLUMN public.plants.reference_url IS 'External botanical reference URL';
