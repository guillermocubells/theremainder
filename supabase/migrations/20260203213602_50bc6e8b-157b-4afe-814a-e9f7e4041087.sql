-- 1. Create a view for public plant access that excludes sensitive location data
CREATE OR REPLACE VIEW public.owned_plants_public
WITH (security_invoker = on) AS
SELECT 
  op.id,
  op.nickname,
  op.common_name,
  op.scientific_name,
  op.photos,
  op.status,
  op.tags,
  op.purchase_date,
  op.created_at,
  op.updated_at,
  op.source_plant_id,
  op.serial_code
  -- Excludes: location_text, location_id, user_id, order_id, order_item_id, next_checkin_date
FROM public.owned_plants op
INNER JOIN public.plant_public_slugs pps ON pps.owned_plant_id = op.id
WHERE pps.is_public = true;

-- 2. Add policy to allow public SELECT on the view (via the base table join)
-- The view already filters to only public plants, but we need a policy for public access
CREATE POLICY "Anyone can view public plants via view" 
ON public.owned_plants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.plant_public_slugs pps 
    WHERE pps.owned_plant_id = owned_plants.id 
    AND pps.is_public = true
  )
);

-- 3. Fix shared_search_lists to default to private
ALTER TABLE public.shared_search_lists 
ALTER COLUMN is_public SET DEFAULT false;

-- 4. Update the existing policy comment for clarity
COMMENT ON POLICY "Users can view own plants" ON public.owned_plants IS 
'Owners can always view their own plants with full details including location';

COMMENT ON POLICY "Anyone can view public plants via view" ON public.owned_plants IS 
'Public access for shared plants - use owned_plants_public view to exclude sensitive location data';