
-- ═══════════════════════════════════════════════════════
-- 1. Dead Letter Queue table
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.job_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id uuid NOT NULL,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  first_failed_at timestamptz,
  dead_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_dead_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dead letters"
  ON public.job_dead_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_job_dead_letters_type ON job_dead_letters(job_type);
CREATE INDEX idx_job_dead_letters_dead_at ON job_dead_letters(dead_at);

-- ═══════════════════════════════════════════════════════
-- 2. enqueue_job() — clean abstraction for producers
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_job_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_priority integer DEFAULT 0,
  p_delay_seconds integer DEFAULT 0,
  p_max_attempts integer DEFAULT 5,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  _scheduled_at timestamptz;
  _job_id uuid;
  _existing_id uuid;
BEGIN
  -- Idempotency check: skip if a pending/processing job with the same key exists
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO _existing_id
    FROM job_queue
    WHERE idempotency_key = p_idempotency_key
      AND status IN ('pending', 'processing')
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      RETURN _existing_id;
    END IF;
  END IF;

  _scheduled_at := now() + (p_delay_seconds || ' seconds')::interval;

  INSERT INTO job_queue (job_type, payload, priority, max_attempts, scheduled_at, idempotency_key)
  VALUES (p_job_type, p_payload, p_priority, p_max_attempts, _scheduled_at, p_idempotency_key)
  RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════
-- 3. Auto-archive dead jobs trigger
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION archive_dead_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'dead' AND (OLD.status IS DISTINCT FROM 'dead') THEN
    INSERT INTO job_dead_letters (
      original_job_id, job_type, payload, attempts, max_attempts,
      last_error, first_failed_at
    ) VALUES (
      NEW.id, NEW.job_type, NEW.payload, NEW.attempts, NEW.max_attempts,
      NEW.last_error, NEW.started_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_archive_dead_job ON job_queue;
CREATE TRIGGER trg_archive_dead_job
  AFTER UPDATE ON job_queue
  FOR EACH ROW
  WHEN (NEW.status = 'dead')
  EXECUTE FUNCTION archive_dead_job();

-- ═══════════════════════════════════════════════════════
-- 4. Cleanup function: purge completed jobs older than 7 days
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_completed_jobs(p_retention_days integer DEFAULT 7)
RETURNS integer AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM job_queue
  WHERE status IN ('completed', 'dead')
    AND updated_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════
-- 5. Dequeue function with row-level locking (FOR UPDATE SKIP LOCKED)
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION dequeue_jobs(p_batch_size integer DEFAULT 10)
RETURNS SETOF job_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET status = 'processing', started_at = now(), updated_at = now()
  WHERE id IN (
    SELECT id FROM job_queue
    WHERE (status = 'pending' OR (status = 'failed' AND next_retry_at <= now()))
      AND scheduled_at <= now()
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════
-- 6. Retry a dead-letter job (re-enqueue)
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION retry_dead_letter(p_dead_letter_id uuid, p_max_attempts integer DEFAULT 3)
RETURNS uuid AS $$
DECLARE
  _dl record;
  _job_id uuid;
BEGIN
  SELECT * INTO _dl FROM job_dead_letters WHERE id = p_dead_letter_id AND resolved_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dead letter not found or already resolved';
  END IF;

  _job_id := enqueue_job(_dl.job_type, _dl.payload, 0, 0, p_max_attempts);

  UPDATE job_dead_letters
  SET resolved_at = now(), resolution_notes = 'Retried as job ' || _job_id::text
  WHERE id = p_dead_letter_id;

  RETURN _job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
