
-- Indexes for grow_logs
CREATE INDEX IF NOT EXISTS idx_grow_logs_user_id ON public.grow_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_grow_logs_taxon_id ON public.grow_logs (taxon_id) WHERE taxon_id IS NOT NULL;

-- Composite index for grow_entries (logId + occurredAt DESC)
CREATE INDEX IF NOT EXISTS idx_grow_entries_log_occurred ON public.grow_entries (log_id, occurred_at DESC);

-- Index for grow_photos
CREATE INDEX IF NOT EXISTS idx_grow_photos_entry_id ON public.grow_photos (entry_id);

-- Index for germination_events (already has idx_germination_events_log but adding IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_germination_events_log ON public.germination_events (log_id);
