
-- Webhook events store for idempotent processing
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_result TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast duplicate lookups
CREATE INDEX idx_webhook_events_stripe_id ON public.webhook_events (stripe_event_id);
CREATE INDEX idx_webhook_events_type ON public.webhook_events (event_type);
CREATE INDEX idx_webhook_events_created ON public.webhook_events (created_at DESC);

-- RLS: only service role / admin access
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
