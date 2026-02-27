
-- ══════════════════════════════════════════════════════════════════════
-- Indexing pipeline: job runs, checkpoints, DLQ
-- ══════════════════════════════════════════════════════════════════════

-- 1. Index job runs – one row per reindex execution
CREATE TABLE public.index_job_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL DEFAULT 'full_reindex',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','cancelled')),
  triggered_by UUID,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  skipped_items INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_index_job_runs_status ON index_job_runs(status);
CREATE INDEX idx_index_job_runs_created ON index_job_runs(created_at DESC);

-- 2. Index checkpoints – tracks cursor position for resumable indexing
CREATE TABLE public.index_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES index_job_runs(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  cursor_value TEXT,
  items_processed INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_index_checkpoints_run_key ON index_checkpoints(run_id, checkpoint_key);

-- 3. Index DLQ – failed individual items for retry/investigation
CREATE TABLE public.index_dead_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES index_job_runs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL DEFAULT 'plant',
  entity_id UUID NOT NULL,
  error_message TEXT,
  error_details JSONB,
  attempts INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_index_dlq_unresolved ON index_dead_letters(entity_type, entity_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_index_dlq_run ON index_dead_letters(run_id);

-- ── RLS (admin-only, like job_queue) ────────────────────────────────

ALTER TABLE public.index_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.index_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.index_dead_letters ENABLE ROW LEVEL SECURITY;

-- Deny all direct API access; managed via service role / edge functions
CREATE POLICY "Deny direct access to index_job_runs" ON public.index_job_runs
  FOR ALL USING (false);

CREATE POLICY "Deny direct access to index_checkpoints" ON public.index_checkpoints
  FOR ALL USING (false);

CREATE POLICY "Deny direct access to index_dead_letters" ON public.index_dead_letters
  FOR ALL USING (false);

-- Admin read-only policies for dashboard visibility
CREATE POLICY "Admins can read index_job_runs" ON public.index_job_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read index_checkpoints" ON public.index_checkpoints
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read index_dead_letters" ON public.index_dead_letters
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ── Updated_at triggers ─────────────────────────────────────────────

CREATE TRIGGER update_index_job_runs_updated_at
  BEFORE UPDATE ON public.index_job_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_index_checkpoints_updated_at
  BEFORE UPDATE ON public.index_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Cleanup function for old completed runs ─────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_index_job_runs(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM index_job_runs
  WHERE status IN ('completed', 'cancelled', 'failed')
    AND created_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ── Cleanup function for resolved DLQ entries ───────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_index_dead_letters(p_retention_days INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM index_dead_letters
  WHERE resolved_at IS NOT NULL
    AND resolved_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ── Retry helper for index DLQ ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.retry_index_dead_letter(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dl RECORD;
BEGIN
  SELECT * INTO v_dl FROM index_dead_letters
  WHERE id = p_id AND resolved_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_dl.attempts >= v_dl.max_attempts THEN
    RAISE EXCEPTION 'Max attempts (%) reached for dead letter %', v_dl.max_attempts, p_id;
  END IF;

  UPDATE index_dead_letters
  SET attempts = attempts + 1, last_attempted_at = now()
  WHERE id = p_id;

  -- Enqueue a reindex job for this specific entity
  PERFORM enqueue_job(
    'reindex_single',
    jsonb_build_object('entity_type', v_dl.entity_type, 'entity_id', v_dl.entity_id, 'dlq_id', p_id),
    5
  );

  RETURN TRUE;
END;
$$;
