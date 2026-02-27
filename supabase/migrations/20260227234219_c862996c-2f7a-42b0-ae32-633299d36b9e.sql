
-- Add blurhash to collection_item_media
ALTER TABLE public.collection_item_media
  ADD COLUMN IF NOT EXISTS blurhash text;

-- Add thumbnail + blurhash columns to grow_entry_media
ALTER TABLE public.grow_entry_media
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_width int,
  ADD COLUMN IF NOT EXISTS thumbnail_height int,
  ADD COLUMN IF NOT EXISTS original_width int,
  ADD COLUMN IF NOT EXISTS original_height int,
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS blurhash text;

-- Index for batch processing: find unprocessed media
CREATE INDEX IF NOT EXISTS idx_collection_item_media_no_thumb
  ON public.collection_item_media (created_at)
  WHERE thumbnail_storage_path IS NULL AND media_type = 'image';

CREATE INDEX IF NOT EXISTS idx_grow_entry_media_no_thumb
  ON public.grow_entry_media (created_at)
  WHERE thumbnail_storage_path IS NULL;
