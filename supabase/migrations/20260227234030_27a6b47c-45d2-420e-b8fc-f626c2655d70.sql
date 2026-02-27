
-- Species/taxon aggregates and log-level stats function
CREATE OR REPLACE FUNCTION public.grow_user_aggregates(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_species jsonb;
  v_summary jsonb;
BEGIN
  -- Per-species/taxon aggregates
  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_species
  FROM (
    SELECT
      gl.taxon_id,
      gl.species,
      COUNT(DISTINCT gl.id)::int AS log_count,
      COUNT(ge.id)::int AS entry_count,
      ROUND(AVG(ge.rating)::numeric, 2) AS avg_rating,
      COUNT(ge.id) FILTER (WHERE ge.type = 'outcome')::int AS outcome_count,
      jsonb_object_agg_strict(
        ge.type,
        cnt
      ) AS entries_by_type,
      -- Germination stats
      COALESCE(SUM(gev.count_sown), 0)::int AS total_sown,
      COALESCE(SUM(gev.count_germinated), 0)::int AS total_germinated,
      CASE WHEN COALESCE(SUM(gev.count_sown), 0) > 0
        THEN ROUND((SUM(gev.count_germinated)::numeric / SUM(gev.count_sown)) * 100, 2)
        ELSE NULL
      END AS germination_rate_pct,
      MIN(gl.created_at) AS first_log_at,
      MAX(gl.created_at) AS latest_log_at
    FROM grow_logs gl
    LEFT JOIN grow_entries ge ON ge.log_id = gl.id
    LEFT JOIN germination_events gev ON gev.log_id = gl.id
    LEFT JOIN LATERAL (
      SELECT ge2.type, COUNT(*)::int AS cnt
      FROM grow_entries ge2 WHERE ge2.log_id = gl.id
      GROUP BY ge2.type
    ) type_counts ON true
    WHERE gl.user_id = p_user_id
    GROUP BY gl.taxon_id, gl.species
    ORDER BY log_count DESC
  ) s;

  -- Overall summary
  SELECT jsonb_build_object(
    'total_logs', COUNT(DISTINCT gl.id)::int,
    'total_entries', COUNT(ge.id)::int,
    'avg_rating', ROUND(AVG(ge.rating)::numeric, 2),
    'total_sown', COALESCE(SUM(gev.count_sown), 0)::int,
    'total_germinated', COALESCE(SUM(gev.count_germinated), 0)::int,
    'overall_germination_rate_pct', CASE WHEN COALESCE(SUM(gev.count_sown), 0) > 0
      THEN ROUND((SUM(gev.count_germinated)::numeric / SUM(gev.count_sown)) * 100, 2)
      ELSE NULL END,
    'entries_by_type', (
      SELECT COALESCE(jsonb_object_agg(ge3.type, ge3.cnt), '{}'::jsonb)
      FROM (SELECT type, COUNT(*)::int AS cnt FROM grow_entries WHERE user_id = p_user_id GROUP BY type) ge3
    )
  )
  INTO v_summary
  FROM grow_logs gl
  LEFT JOIN grow_entries ge ON ge.log_id = gl.id
  LEFT JOIN germination_events gev ON gev.log_id = gl.id
  WHERE gl.user_id = p_user_id;

  RETURN jsonb_build_object('summary', v_summary, 'by_species', v_species);
END;
$$;

-- Per-log stats function
CREATE OR REPLACE FUNCTION public.grow_log_stats(p_log_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_log FROM grow_logs WHERE id = p_log_id;
  IF v_log IS NULL THEN RETURN NULL; END IF;
  IF v_log.user_id != p_user_id AND v_log.visibility = 'private' THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'log_id', p_log_id,
    'title', v_log.title,
    'species', v_log.species,
    'taxon_id', v_log.taxon_id,
    'entry_count', COUNT(ge.id)::int,
    'avg_rating', ROUND(AVG(ge.rating)::numeric, 2),
    'entries_by_type', (
      SELECT COALESCE(jsonb_object_agg(sub.type, sub.cnt), '{}'::jsonb)
      FROM (SELECT type, COUNT(*)::int AS cnt FROM grow_entries WHERE log_id = p_log_id GROUP BY type) sub
    ),
    'first_entry_at', MIN(ge.occurred_at),
    'latest_entry_at', MAX(ge.occurred_at),
    'duration_days', EXTRACT(DAY FROM (MAX(ge.occurred_at) - MIN(ge.occurred_at)))::int,
    'photo_count', (SELECT COUNT(*)::int FROM grow_entry_media WHERE log_id = p_log_id),
    'germination', (
      SELECT jsonb_build_object(
        'event_count', COUNT(*)::int,
        'total_sown', COALESCE(SUM(count_sown), 0)::int,
        'total_germinated', COALESCE(SUM(count_germinated), 0)::int,
        'germination_rate_pct', CASE WHEN COALESCE(SUM(count_sown), 0) > 0
          THEN ROUND((SUM(count_germinated)::numeric / SUM(count_sown)) * 100, 2)
          ELSE NULL END,
        'avg_days_to_sprout', ROUND(AVG(
          CASE WHEN first_sprout_at IS NOT NULL
            THEN EXTRACT(DAY FROM (first_sprout_at - created_at))
            ELSE NULL END
        )::numeric, 1)
      )
      FROM germination_events WHERE log_id = p_log_id
    )
  )
  INTO v_result
  FROM grow_entries ge
  WHERE ge.log_id = p_log_id;

  RETURN v_result;
END;
$$;
