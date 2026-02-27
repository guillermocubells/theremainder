-- Add tags column to grow_entries
ALTER TABLE public.grow_entries ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_grow_entries_log_type ON public.grow_entries (log_id, type);

-- Add check constraint for valid entry types
ALTER TABLE public.grow_entries ADD CONSTRAINT grow_entries_type_check 
  CHECK (type IN ('observation', 'watering', 'fertilizing', 'pruning', 'repotting', 'outcome'));

-- Add check constraint for rating range
ALTER TABLE public.grow_entries ADD CONSTRAINT grow_entries_rating_check 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));