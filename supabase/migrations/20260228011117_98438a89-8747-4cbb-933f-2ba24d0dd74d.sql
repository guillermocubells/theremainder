
-- Fix apply_score_decay to use 'delta' column instead of 'points'
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
    SET delta = GREATEST(1, FLOOR(delta * p_decay_factor)),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('decayed_at', now()::text)
    WHERE created_at < now() - make_interval(days => p_decay_days)
      AND (metadata IS NULL OR NOT (metadata ? 'decayed_at'))
      AND delta > 1
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
    SELECT rl.user_id, COALESCE(SUM(rl.delta), 0)::int AS total
    FROM reputation_ledger rl
    GROUP BY rl.user_id
  ) sub
  WHERE ur.user_id = sub.user_id
    AND ur.total_score != sub.total;

  RETURN QUERY SELECT v_users, v_entries;
END;
$$;
