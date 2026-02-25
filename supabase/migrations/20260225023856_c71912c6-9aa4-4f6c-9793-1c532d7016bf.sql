
-- Job queue table for background tasks with retries and exponential backoff
CREATE TABLE public.job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,           -- e.g. 'send_email', 'stripe_webhook', 'notify_restock'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed, dead
  priority INTEGER NOT NULL DEFAULT 0,     -- higher = more urgent
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT UNIQUE       -- prevent duplicate jobs
);

-- Indexes for efficient dequeue
CREATE INDEX idx_job_queue_dequeue ON public.job_queue (status, scheduled_at, priority DESC)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_job_queue_type ON public.job_queue (job_type);
CREATE INDEX idx_job_queue_cleanup ON public.job_queue (status, completed_at)
  WHERE status IN ('completed', 'dead');

-- Enable RLS (only service role accesses this)
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- No public policies — only service role can read/write

-- Updated_at trigger
CREATE TRIGGER update_job_queue_updated_at
  BEFORE UPDATE ON public.job_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to enqueue a job
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INTEGER DEFAULT 0,
  p_max_attempts INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMPTZ DEFAULT now(),
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO job_queue (job_type, payload, priority, max_attempts, scheduled_at, idempotency_key)
  VALUES (p_job_type, p_payload, p_priority, p_max_attempts, p_scheduled_at, p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to calculate exponential backoff delay
CREATE OR REPLACE FUNCTION public.calculate_backoff(p_attempts INTEGER)
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  -- Exponential backoff: 30s, 2m, 8m, 32m, 2h (capped at 2 hours)
  SELECT LEAST(
    (power(2, p_attempts) * 30)::INTEGER * interval '1 second',
    interval '2 hours'
  );
$$;
