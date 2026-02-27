
-- Fix the species aggregates function - remove invalid jsonb_object_agg_strict and lateral join
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
      (
        SELECT COALESCE(jsonb_object_agg(sub.type, sub.cnt), '{}'::jsonb)
        FROM (
          SELECT ge2.type, COUNT(*)::int AS cnt
          FROM grow_entries ge2
          JOIN grow_logs gl2 ON gl2.id = ge2.log_id
          WHERE gl2.user_id = p_user_id
            AND (gl.taxon_id IS NOT NULL AND gl2.taxon_id = gl.taxon_id
                 OR gl.taxon_id IS NULL AND gl2.species = gl.species)
          GROUP BY ge2.type
        ) sub
      ) AS entries_by_type,
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
    WHERE gl.user_id = p_user_id
    GROUP BY gl.taxon_id, gl.species
    ORDER BY log_count DESC
  ) s;

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
