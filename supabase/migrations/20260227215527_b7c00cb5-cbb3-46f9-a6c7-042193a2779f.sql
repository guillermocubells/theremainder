
-- ══════════════════════════════════════════════════════════════════════
-- Search Analytics: query logs, click-through tracking, admin metrics
-- ══════════════════════════════════════════════════════════════════════

-- Search query log (pseudonymized)
CREATE TABLE public.search_query_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_normalized TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  sort TEXT,
  ab_variant TEXT DEFAULT 'A',
  total_results INTEGER NOT NULL DEFAULT 0,
  is_zero_result BOOLEAN GENERATED ALWAYS AS (total_results = 0) STORED,
  page INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 24,
  response_time_ms INTEGER,
  -- Pseudonymized: hash of user_id, never store raw
  user_hash TEXT,
  session_id TEXT,
  locale TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Click-through log
CREATE TABLE public.search_click_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_log_id UUID REFERENCES search_query_logs(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  plant_id UUID NOT NULL,
  position INTEGER NOT NULL, -- 1-based rank position in results
  score NUMERIC(10,4),
  user_hash TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_sql_created ON search_query_logs(created_at DESC);
CREATE INDEX idx_sql_zero ON search_query_logs(is_zero_result) WHERE is_zero_result = true;
CREATE INDEX idx_sql_query ON search_query_logs(query_normalized);
CREATE INDEX idx_scl_created ON search_click_logs(created_at DESC);
CREATE INDEX idx_scl_plant ON search_click_logs(plant_id);
CREATE INDEX idx_scl_query_log ON search_click_logs(query_log_id);

-- RLS
ALTER TABLE public.search_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_click_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "Admins can read search query logs"
  ON public.search_query_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read search click logs"
  ON public.search_click_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts (edge functions use service key)
CREATE POLICY "Service can insert query logs"
  ON public.search_query_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert click logs"
  ON public.search_click_logs FOR INSERT
  WITH CHECK (true);

-- Materialized view for daily search metrics (refreshed periodically)
CREATE MATERIALIZED VIEW public.search_metrics_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  COUNT(*) AS total_queries,
  COUNT(*) FILTER (WHERE is_zero_result) AS zero_result_queries,
  COUNT(DISTINCT query_normalized) AS unique_queries,
  COUNT(DISTINCT user_hash) FILTER (WHERE user_hash IS NOT NULL) AS unique_users,
  AVG(total_results)::numeric(10,1) AS avg_results,
  AVG(response_time_ms)::numeric(10,1) AS avg_response_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)::numeric(10,1) AS p95_response_ms,
  ab_variant
FROM search_query_logs
GROUP BY day, ab_variant
ORDER BY day DESC;

CREATE UNIQUE INDEX idx_smd_day_variant ON search_metrics_daily(day, ab_variant);

-- Function to get top queries for admin dashboard
CREATE OR REPLACE FUNCTION public.get_search_analytics(
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'period_days', p_days,
    'generated_at', now(),
    'summary', (
      SELECT jsonb_build_object(
        'total_queries', COUNT(*),
        'zero_result_queries', COUNT(*) FILTER (WHERE is_zero_result),
        'zero_result_rate', ROUND(COUNT(*) FILTER (WHERE is_zero_result)::numeric / GREATEST(COUNT(*), 1) * 100, 1),
        'unique_queries', COUNT(DISTINCT query_normalized),
        'unique_users', COUNT(DISTINCT user_hash) FILTER (WHERE user_hash IS NOT NULL),
        'avg_results', ROUND(AVG(total_results)::numeric, 1),
        'avg_response_ms', ROUND(AVG(response_time_ms)::numeric, 1)
      )
      FROM search_query_logs
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'top_queries', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT query_normalized, COUNT(*) AS count,
               ROUND(AVG(total_results)::numeric, 1) AS avg_results,
               COUNT(*) FILTER (WHERE is_zero_result) AS zero_count
        FROM search_query_logs
        WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY query_normalized
        ORDER BY count DESC
        LIMIT p_limit
      ) t
    ), '[]'::jsonb),
    'top_zero_queries', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT query_normalized, COUNT(*) AS count
        FROM search_query_logs
        WHERE created_at >= now() - (p_days || ' days')::interval
          AND is_zero_result = true
        GROUP BY query_normalized
        ORDER BY count DESC
        LIMIT p_limit
      ) t
    ), '[]'::jsonb),
    'top_clicked_plants', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT cl.plant_id, p.name AS plant_name,
               COUNT(*) AS clicks,
               ROUND(AVG(cl.position)::numeric, 1) AS avg_position
        FROM search_click_logs cl
        LEFT JOIN plants p ON p.id = cl.plant_id
        WHERE cl.created_at >= now() - (p_days || ' days')::interval
        GROUP BY cl.plant_id, p.name
        ORDER BY clicks DESC
        LIMIT p_limit
      ) t
    ), '[]'::jsonb),
    'click_through_rate', (
      SELECT ROUND(
        COALESCE(
          (SELECT COUNT(*)::numeric FROM search_click_logs WHERE created_at >= now() - (p_days || ' days')::interval)
          / GREATEST((SELECT COUNT(*)::numeric FROM search_query_logs WHERE created_at >= now() - (p_days || ' days')::interval), 1)
          * 100
        , 0), 1
      )
    ),
    'ab_comparison', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT ab_variant,
               COUNT(*) AS queries,
               ROUND(AVG(total_results)::numeric, 1) AS avg_results,
               ROUND(COUNT(*) FILTER (WHERE is_zero_result)::numeric / GREATEST(COUNT(*), 1) * 100, 1) AS zero_rate,
               ROUND(AVG(response_time_ms)::numeric, 1) AS avg_ms
        FROM search_query_logs
        WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY ab_variant
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Auto-cleanup: delete logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_search_logs(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM search_click_logs WHERE created_at < now() - (p_retention_days || ' days')::interval;
  DELETE FROM search_query_logs WHERE created_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
