
-- Materialized view: species-level aggregates across grow_logs
CREATE MATERIALIZED VIEW public.species_grow_stats AS
SELECT
  gl.species,
  gl.taxon_id,
  COUNT(DISTINCT gl.id) AS log_count,
  -- Average rating from entries
  ROUND(AVG(ge.rating)::numeric, 2) AS avg_rating,
  -- Survival %: logs with at least one entry in last 90 days / total logs
  ROUND(
    100.0 * COUNT(DISTINCT gl.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM grow_entries e2
        WHERE e2.log_id = gl.id AND e2.occurred_at > now() - interval '90 days'
      )
    ) / NULLIF(COUNT(DISTINCT gl.id), 0),
    1
  ) AS survival_pct,
  -- Germination %: total germinated / total sown
  CASE
    WHEN COALESCE(SUM(gev.count_sown), 0) = 0 THEN NULL
    ELSE ROUND(100.0 * SUM(gev.count_germinated) / SUM(gev.count_sown), 1)
  END AS germination_pct,
  COUNT(DISTINCT ge.id) AS total_entries,
  now() AS refreshed_at
FROM grow_logs gl
LEFT JOIN grow_entries ge ON ge.log_id = gl.id
LEFT JOIN germination_events gev ON gev.log_id = gl.id
WHERE gl.species IS NOT NULL
GROUP BY gl.species, gl.taxon_id;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_species_grow_stats_pk
  ON public.species_grow_stats (species, COALESCE(taxon_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX idx_species_grow_stats_taxon
  ON public.species_grow_stats (taxon_id) WHERE taxon_id IS NOT NULL;

-- Refresh function callable via RPC
CREATE OR REPLACE FUNCTION public.refresh_species_grow_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.species_grow_stats;
END;
$$;
