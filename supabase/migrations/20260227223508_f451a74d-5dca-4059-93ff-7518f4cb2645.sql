
-- Table for media attached to collection items
CREATE TABLE IF NOT EXISTS public.collection_item_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_item_id UUID NOT NULL REFERENCES public.collection_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  alt_text VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make the collection-photos bucket public so images are viewable
UPDATE storage.buckets SET public = true WHERE id = 'collection-photos';

-- RLS
ALTER TABLE public.collection_item_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection item media"
  ON public.collection_item_media FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own collection item media"
  ON public.collection_item_media FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own collection item media"
  ON public.collection_item_media FOR DELETE
  USING (user_id = auth.uid());

-- Index for lookups
CREATE INDEX idx_collection_item_media_item ON public.collection_item_media(collection_item_id);
