
-- Add thumbnail fields to collection_item_media
ALTER TABLE public.collection_item_media
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_width integer,
  ADD COLUMN IF NOT EXISTS thumbnail_height integer,
  ADD COLUMN IF NOT EXISTS original_width integer,
  ADD COLUMN IF NOT EXISTS original_height integer,
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at timestamptz;

-- Index for finding media needing thumbnails
CREATE INDEX IF NOT EXISTS idx_cim_thumbnail_pending
  ON public.collection_item_media (created_at)
  WHERE thumbnail_storage_path IS NULL AND media_type = 'image';
