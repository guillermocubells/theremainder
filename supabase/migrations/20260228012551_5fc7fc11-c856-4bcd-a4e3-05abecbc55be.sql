
-- Analytics table for tracking validation interactions
CREATE TABLE public.validation_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'vote', 'comment', 'report', 'verification_outcome'
  action TEXT NOT NULL,     -- 'upvote','downvote','toggle_off','create','edit','delete','submit','approve','reject','warn','remove','dismiss'
  entity_type TEXT,         -- 'review', 'comment', 'verification'
  entity_id UUID,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_validation_analytics_type_created ON public.validation_analytics (event_type, created_at DESC);
CREATE INDEX idx_validation_analytics_created ON public.validation_analytics (created_at DESC);

-- Enable RLS
ALTER TABLE public.validation_analytics ENABLE ROW LEVEL SECURITY;

-- Only admins/moderators can read analytics
CREATE POLICY "Admins can read validation analytics"
  ON public.validation_analytics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Insert allowed for authenticated users (instrumentation)
CREATE POLICY "Authenticated users can insert analytics"
  ON public.validation_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No update/delete for anyone
