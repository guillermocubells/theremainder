
-- Drop existing policy and recreate
DROP POLICY IF EXISTS "Users can view own collection photos" ON storage.objects;

CREATE POLICY "Users can view own collection photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'collection-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.owned_plants op
      JOIN public.plant_public_slugs pps ON op.id = pps.owned_plant_id
      WHERE pps.is_public = true
      AND op.user_id::text = (storage.foldername(name))[1]
    )
  )
);
