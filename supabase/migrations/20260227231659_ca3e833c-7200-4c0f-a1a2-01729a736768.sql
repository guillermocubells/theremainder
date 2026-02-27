
-- Germination batches: each setup attempt
CREATE TABLE public.germination_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  species_name TEXT NOT NULL,
  common_name TEXT,
  seed_count INTEGER NOT NULL DEFAULT 1,
  method TEXT NOT NULL DEFAULT 'soil',
  substrate TEXT,
  temperature_c NUMERIC(4,1),
  humidity_pct INTEGER,
  light_hours NUMERIC(3,1),
  notes TEXT,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Germination entries: individual sprout observations within a batch
CREATE TABLE public.germination_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.germination_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  sprout_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_germination_batches_user ON public.germination_batches(user_id);
CREATE INDEX idx_germination_batches_species ON public.germination_batches(species_name);
CREATE INDEX idx_germination_entries_batch ON public.germination_entries(batch_id);

-- RLS
ALTER TABLE public.germination_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.germination_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON public.germination_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own batches"
  ON public.germination_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
  ON public.germination_batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own batches"
  ON public.germination_batches FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own entries"
  ON public.germination_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entries"
  ON public.germination_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.germination_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.germination_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_germination_batches_updated_at
  BEFORE UPDATE ON public.germination_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
