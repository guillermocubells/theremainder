
-- Content reports table (idempotent per user + entity)
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('review', 'comment')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'misinformation', 'harassment', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  UNIQUE (entity_type, entity_id, user_id)
);

CREATE INDEX idx_content_reports_entity ON public.content_reports(entity_type, entity_id);
CREATE INDEX idx_content_reports_status ON public.content_reports(status);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports
CREATE POLICY "Users can read own reports"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Auth users can create reports
CREATE POLICY "Auth users can create reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
