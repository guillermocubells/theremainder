
-- Plant reviews table (persisted)
CREATE TABLE public.plant_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plant_reviews_plant ON public.plant_reviews(plant_id);
CREATE INDEX idx_plant_reviews_user ON public.plant_reviews(user_id);

ALTER TABLE public.plant_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.plant_reviews FOR SELECT USING (true);

CREATE POLICY "Auth users can create reviews"
  ON public.plant_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.plant_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.plant_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Review votes table
CREATE TABLE public.review_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.plant_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_votes_review ON public.review_votes(review_id);
CREATE INDEX idx_review_votes_user ON public.review_votes(user_id);

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON public.review_votes FOR SELECT USING (true);

CREATE POLICY "Auth users can vote"
  ON public.review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change own vote"
  ON public.review_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote"
  ON public.review_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to keep score in sync
CREATE OR REPLACE FUNCTION public.update_review_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.plant_reviews
      SET score = COALESCE((SELECT SUM(vote_type) FROM public.review_votes WHERE review_id = OLD.review_id), 0),
          updated_at = now()
      WHERE id = OLD.review_id;
    RETURN OLD;
  ELSE
    UPDATE public.plant_reviews
      SET score = COALESCE((SELECT SUM(vote_type) FROM public.review_votes WHERE review_id = NEW.review_id), 0),
          updated_at = now()
      WHERE id = NEW.review_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_review_score
  AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_review_score();

-- Timestamp trigger for reviews
CREATE TRIGGER update_plant_reviews_updated_at
  BEFORE UPDATE ON public.plant_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
