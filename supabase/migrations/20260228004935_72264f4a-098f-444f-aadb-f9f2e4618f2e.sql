
-- Trigger-backed aggregation table for per-plant review confidence
CREATE TABLE public.plant_review_stats (
  plant_id TEXT NOT NULL PRIMARY KEY,
  total_reviews INT NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_upvotes INT NOT NULL DEFAULT 0,
  total_downvotes INT NOT NULL DEFAULT 0,
  net_votes INT NOT NULL DEFAULT 0,
  -- Wilson score lower bound (95% CI) for ranking
  confidence_score NUMERIC(6,5) NOT NULL DEFAULT 0,
  -- Decay: timestamp of most recent activity (review or vote)
  last_activity_at TIMESTAMPTZ,
  -- Exponential decay factor (0-1), recomputed on read or via cron
  activity_decay NUMERIC(5,4) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_review_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review stats"
  ON public.plant_review_stats FOR SELECT USING (true);

-- Wilson score lower bound function (95% confidence)
CREATE OR REPLACE FUNCTION public.wilson_score(pos INT, total INT)
RETURNS NUMERIC AS $$
DECLARE
  z NUMERIC := 1.96;
  phat NUMERIC;
  denom NUMERIC;
BEGIN
  IF total = 0 THEN RETURN 0; END IF;
  phat := pos::NUMERIC / total;
  denom := 1 + z * z / total;
  RETURN GREATEST(0,
    (phat + z * z / (2 * total) - z * sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)) / denom
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Core refresh function
CREATE OR REPLACE FUNCTION public.refresh_plant_review_stats(p_plant_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_total INT;
  v_avg NUMERIC;
  v_up INT;
  v_down INT;
  v_last TIMESTAMPTZ;
  v_confidence NUMERIC;
  v_positive INT;
  v_total_signals INT;
BEGIN
  -- Review aggregates
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO v_total, v_avg
    FROM public.plant_reviews WHERE plant_id = p_plant_id;

  -- Vote aggregates across all reviews of this plant
  SELECT
    COALESCE(SUM(CASE WHEN rv.vote_type = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rv.vote_type = -1 THEN 1 ELSE 0 END), 0)
    INTO v_up, v_down
    FROM public.review_votes rv
    JOIN public.plant_reviews pr ON pr.id = rv.review_id
    WHERE pr.plant_id = p_plant_id;

  -- Last activity
  SELECT GREATEST(
    (SELECT MAX(created_at) FROM public.plant_reviews WHERE plant_id = p_plant_id),
    (SELECT MAX(rv.created_at) FROM public.review_votes rv JOIN public.plant_reviews pr ON pr.id = rv.review_id WHERE pr.plant_id = p_plant_id)
  ) INTO v_last;

  -- Confidence: Wilson on (positive signals / total signals)
  -- Positive signals = reviews with rating >= 4 + upvotes
  SELECT COALESCE(SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END), 0)
    INTO v_positive
    FROM public.plant_reviews WHERE plant_id = p_plant_id;

  v_positive := v_positive + v_up;
  v_total_signals := v_total + v_up + v_down;
  v_confidence := public.wilson_score(v_positive, v_total_signals);

  INSERT INTO public.plant_review_stats
    (plant_id, total_reviews, avg_rating, total_upvotes, total_downvotes, net_votes, confidence_score, last_activity_at, updated_at)
  VALUES
    (p_plant_id, v_total, ROUND(v_avg, 2), v_up, v_down, v_up - v_down, ROUND(v_confidence, 5), v_last, now())
  ON CONFLICT (plant_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    avg_rating = EXCLUDED.avg_rating,
    total_upvotes = EXCLUDED.total_upvotes,
    total_downvotes = EXCLUDED.total_downvotes,
    net_votes = EXCLUDED.net_votes,
    confidence_score = EXCLUDED.confidence_score,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on plant_reviews
CREATE OR REPLACE FUNCTION public.trg_refresh_stats_review()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_plant_review_stats(OLD.plant_id);
  ELSE
    PERFORM public.refresh_plant_review_stats(NEW.plant_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_review_stats_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.plant_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_stats_review();

-- Trigger on review_votes (needs to resolve plant_id via review)
CREATE OR REPLACE FUNCTION public.trg_refresh_stats_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_plant_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT plant_id INTO v_plant_id FROM public.plant_reviews WHERE id = OLD.review_id;
  ELSE
    SELECT plant_id INTO v_plant_id FROM public.plant_reviews WHERE id = NEW.review_id;
  END IF;
  IF v_plant_id IS NOT NULL THEN
    PERFORM public.refresh_plant_review_stats(v_plant_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_review_stats_on_vote
  AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_stats_vote();
