
CREATE TABLE public.germination_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.grow_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seed_batch_id UUID REFERENCES public.germination_batches(id) ON DELETE SET NULL,
  method TEXT,
  medium TEXT,
  temp_c NUMERIC,
  humidity_pct NUMERIC,
  light TEXT,
  count_sown INTEGER NOT NULL DEFAULT 0,
  count_germinated INTEGER NOT NULL DEFAULT 0,
  first_sprout_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_germination_events_log ON public.germination_events (log_id);
CREATE INDEX idx_germination_events_batch ON public.germination_events (seed_batch_id) WHERE seed_batch_id IS NOT NULL;

ALTER TABLE public.germination_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own germination events"
  ON public.germination_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own germination events"
  ON public.germination_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own germination events"
  ON public.germination_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own germination events"
  ON public.germination_events FOR DELETE
  USING (auth.uid() = user_id);

-- Public read when parent grow_log is public/link
CREATE POLICY "Public log germination events are readable"
  ON public.germination_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.grow_logs
      WHERE id = log_id AND visibility IN ('public', 'link')
    )
  );

CREATE TRIGGER update_germination_events_updated_at
  BEFORE UPDATE ON public.germination_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
