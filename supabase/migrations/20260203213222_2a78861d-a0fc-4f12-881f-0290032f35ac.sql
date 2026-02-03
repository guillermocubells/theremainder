-- Make collection-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'collection-photos';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view collection photos" ON storage.objects;

-- Create new policy: owners can view their own photos
CREATE POLICY "Users can view own collection photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'collection-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy: public can view photos of plants marked as public
CREATE POLICY "Anyone can view photos of public plants" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'collection-photos' AND 
  EXISTS (
    SELECT 1 FROM public.plant_public_slugs pps
    JOIN public.owned_plants op ON pps.owned_plant_id = op.id
    WHERE pps.is_public = true
    AND op.user_id::text = (storage.foldername(name))[1]
  )
);