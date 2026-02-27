
-- Create storage bucket for grow log media
INSERT INTO storage.buckets (id, name, public)
VALUES ('grow-media', 'grow-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can view public media
CREATE POLICY "Public read access for grow-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'grow-media');

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'grow-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can update their own files
CREATE POLICY "Users update own files in grow-media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'grow-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can delete their own files
CREATE POLICY "Users delete own files in grow-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'grow-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Media reference table
CREATE TABLE public.grow_entry_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.grow_entries(id) ON DELETE CASCADE,
  log_id UUID NOT NULL REFERENCES public.grow_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_grow_entry_media_entry ON public.grow_entry_media(entry_id);
CREATE INDEX idx_grow_entry_media_log ON public.grow_entry_media(log_id);

-- RLS
ALTER TABLE public.grow_entry_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for accessible logs"
ON public.grow_entry_media FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.grow_logs gl
    WHERE gl.id = log_id AND gl.visibility IN ('public', 'link')
  )
);

CREATE POLICY "Users can insert own media"
ON public.grow_entry_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
ON public.grow_entry_media FOR DELETE
USING (auth.uid() = user_id);
