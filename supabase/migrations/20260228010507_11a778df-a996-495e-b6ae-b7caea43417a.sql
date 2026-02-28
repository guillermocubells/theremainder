
-- Add resolution columns
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS resolution_action TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Index for moderator queue
CREATE INDEX IF NOT EXISTS idx_content_reports_pending
  ON public.content_reports (status, created_at DESC)
  WHERE status = 'pending';

-- Moderators + admins can view ALL reports
CREATE POLICY "Moderators can view all reports"
  ON public.content_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Moderators + admins can update reports
CREATE POLICY "Moderators can update reports"
  ON public.content_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
