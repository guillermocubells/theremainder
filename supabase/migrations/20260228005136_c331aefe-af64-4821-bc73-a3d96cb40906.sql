
-- Threaded comments on reviews
CREATE TABLE public.review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.plant_reviews(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  depth SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_comments_review ON public.review_comments(review_id);
CREATE INDEX idx_review_comments_parent ON public.review_comments(parent_id);
CREATE INDEX idx_review_comments_user ON public.review_comments(user_id);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.review_comments FOR SELECT USING (true);

CREATE POLICY "Auth users can create comments"
  ON public.review_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.review_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.review_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-set depth from parent
CREATE OR REPLACE FUNCTION public.set_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT depth + 1 INTO NEW.depth
      FROM public.review_comments WHERE id = NEW.parent_id;
  ELSE
    NEW.depth := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_set_comment_depth
  BEFORE INSERT ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_comment_depth();

-- Timestamp trigger
CREATE TRIGGER update_review_comments_updated_at
  BEFORE UPDATE ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
