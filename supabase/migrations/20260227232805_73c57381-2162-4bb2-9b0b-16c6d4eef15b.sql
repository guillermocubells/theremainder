
-- =============================================
-- Grow Logs core tables
-- =============================================

-- 1. grow_logs
CREATE TABLE public.grow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  species TEXT,
  taxon_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grow_logs_user ON public.grow_logs (user_id);
CREATE INDEX idx_grow_logs_taxon ON public.grow_logs (taxon_id) WHERE taxon_id IS NOT NULL;

ALTER TABLE public.grow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON public.grow_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON public.grow_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON public.grow_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON public.grow_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Public/link visibility read access (no auth required)
CREATE POLICY "Public logs are readable by anyone"
  ON public.grow_logs FOR SELECT
  USING (visibility IN ('public', 'link'));

-- 2. grow_entries
CREATE TABLE public.grow_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.grow_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'observation',
  notes TEXT,
  rating SMALLINT,
  media_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grow_entries_log ON public.grow_entries (log_id, occurred_at DESC);

ALTER TABLE public.grow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON public.grow_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON public.grow_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.grow_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.grow_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Public entries readable when parent log is public/link
CREATE POLICY "Public log entries are readable"
  ON public.grow_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.grow_logs
      WHERE id = log_id AND visibility IN ('public', 'link')
    )
  );

-- 3. grow_photos
CREATE TABLE public.grow_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.grow_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  hash TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grow_photos_entry ON public.grow_photos (entry_id, sort_order);

ALTER TABLE public.grow_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON public.grow_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON public.grow_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON public.grow_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Public photos readable when parent log is public/link
CREATE POLICY "Public log photos are readable"
  ON public.grow_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.grow_entries ge
      JOIN public.grow_logs gl ON gl.id = ge.log_id
      WHERE ge.id = entry_id AND gl.visibility IN ('public', 'link')
    )
  );

-- updated_at trigger (reuse existing function)
CREATE TRIGGER update_grow_logs_updated_at
  BEFORE UPDATE ON public.grow_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grow_entries_updated_at
  BEFORE UPDATE ON public.grow_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
