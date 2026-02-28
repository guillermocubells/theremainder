
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Score decay ──
CREATE OR REPLACE FUNCTION public.apply_score_decay(
  p_decay_days INT DEFAULT 180,
  p_decay_factor NUMERIC DEFAULT 0.9
)
RETURNS TABLE(users_updated INT, entries_decayed INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entries INT := 0;
  v_users INT := 0;
BEGIN
  WITH decayed AS (
    UPDATE reputation_ledger
    SET points = GREATEST(1, FLOOR(points * p_decay_factor)),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('decayed_at', now()::text)
    WHERE created_at < now() - make_interval(days => p_decay_days)
      AND (metadata IS NULL OR NOT (metadata ? 'decayed_at'))
      AND points > 1
    RETURNING user_id
  )
  SELECT count(DISTINCT user_id), count(*) INTO v_users, v_entries FROM decayed;

  UPDATE user_reputation ur
  SET total_score = sub.total,
      level = CASE
        WHEN sub.total >= 1000 THEN 'expert'
        WHEN sub.total >= 500 THEN 'advanced'
        WHEN sub.total >= 100 THEN 'intermediate'
        ELSE 'beginner'
      END,
      updated_at = now()
  FROM (
    SELECT rl.user_id, COALESCE(SUM(rl.points), 0) AS total
    FROM reputation_ledger rl
    GROUP BY rl.user_id
  ) sub
  WHERE ur.user_id = sub.user_id
    AND ur.total_score != sub.total;

  RETURN QUERY SELECT v_users, v_entries;
END;
$$;

-- ── Vote brigading detection ──
CREATE OR REPLACE FUNCTION public.detect_vote_brigading(
  p_window_minutes INT DEFAULT 30,
  p_threshold INT DEFAULT 5
)
RETURNS TABLE(
  voter_id UUID,
  target_review_id UUID,
  vote_count BIGINT,
  first_vote TIMESTAMPTZ,
  last_vote TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rv.user_id AS voter_id,
    rv.review_id AS target_review_id,
    count(*) AS vote_count,
    min(rv.created_at) AS first_vote,
    max(rv.created_at) AS last_vote
  FROM review_votes rv
  WHERE rv.created_at > now() - interval '1 day'
  GROUP BY rv.user_id, rv.review_id
  HAVING count(*) >= p_threshold
    AND (max(rv.created_at) - min(rv.created_at)) < make_interval(mins => p_window_minutes);
$$;

-- ── Add confidence column to user_reputation ──
ALTER TABLE public.user_reputation
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_maintenance_at TIMESTAMPTZ;

-- ── Confidence recompute ──
CREATE OR REPLACE FUNCTION public.recompute_confidence()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  WITH action_diversity AS (
    SELECT
      rl.user_id,
      count(DISTINCT rl.action_key) AS distinct_actions,
      count(*) AS total_entries,
      LEAST(100, ROUND(
        (count(DISTINCT rl.action_key)::numeric / GREATEST(1, LEAST(count(*), 50))) * 100 *
        LEAST(1, count(*)::numeric / 10)
      )) AS confidence_score
    FROM reputation_ledger rl
    GROUP BY rl.user_id
  )
  UPDATE user_reputation ur
  SET confidence = ad.confidence_score,
      last_maintenance_at = now()
  FROM action_diversity ad
  WHERE ur.user_id = ad.user_id
    AND (ur.confidence IS DISTINCT FROM ad.confidence_score);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;
