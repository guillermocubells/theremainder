
-- Composite index: reviews sorted by score for a plant (hot-ranking queries)
CREATE INDEX IF NOT EXISTS idx_plant_reviews_plant_score
  ON public.plant_reviews (plant_id, score DESC, created_at DESC);

-- Composite index: comments by review + created_at for threaded pagination
CREATE INDEX IF NOT EXISTS idx_review_comments_review_created
  ON public.review_comments (review_id, created_at DESC);

-- Composite index: comments by parent for child lookups
CREATE INDEX IF NOT EXISTS idx_review_comments_parent_created
  ON public.review_comments (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL;

-- Partial index: only open (pending/reviewing) reports for moderation queue
CREATE INDEX IF NOT EXISTS idx_content_reports_open
  ON public.content_reports (created_at DESC)
  WHERE status IN ('pending', 'reviewing');

-- Partial index: open reports per entity for count badges
CREATE INDEX IF NOT EXISTS idx_content_reports_entity_open
  ON public.content_reports (entity_type, entity_id)
  WHERE status IN ('pending', 'reviewing');

-- Composite index on review_votes for tally queries (review_id + vote_type)
CREATE INDEX IF NOT EXISTS idx_review_votes_review_type
  ON public.review_votes (review_id, vote_type);

-- Unique constraint: one review per user per plant
ALTER TABLE public.plant_reviews
  ADD CONSTRAINT plant_reviews_user_plant_unique UNIQUE (user_id, plant_id);

-- Add ON DELETE CASCADE from review_comments to plant_reviews
-- (already exists via review_id_fkey — confirmed above)

-- Add cascading delete for content_reports when the reported entity (review) is deleted
-- We can't do a polymorphic FK, so we add a trigger instead
CREATE OR REPLACE FUNCTION public.cascade_delete_reports_for_review()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.content_reports
  WHERE entity_type = 'review' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_cascade_reports_on_review_delete ON public.plant_reviews;
CREATE TRIGGER trg_cascade_reports_on_review_delete
  BEFORE DELETE ON public.plant_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_reports_for_review();

-- Same for comments
CREATE OR REPLACE FUNCTION public.cascade_delete_reports_for_comment()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.content_reports
  WHERE entity_type = 'comment' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_cascade_reports_on_comment_delete ON public.review_comments;
CREATE TRIGGER trg_cascade_reports_on_comment_delete
  BEFORE DELETE ON public.review_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_reports_for_comment();
