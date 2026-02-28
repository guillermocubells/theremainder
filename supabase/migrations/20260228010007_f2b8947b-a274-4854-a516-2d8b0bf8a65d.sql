
-- Add soft-delete column to review_comments
ALTER TABLE public.review_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for excluding soft-deleted comments
CREATE INDEX IF NOT EXISTS idx_review_comments_active
  ON public.review_comments (review_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Max depth constraint (prevent infinite nesting)
ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_max_depth CHECK (depth <= 3);
