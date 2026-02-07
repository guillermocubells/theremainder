
CREATE POLICY "Anyone can view observations for public plants"
ON public.plant_observations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM plant_public_slugs pps
    WHERE pps.owned_plant_id = plant_observations.owned_plant_id
    AND pps.is_public = true
  )
);
