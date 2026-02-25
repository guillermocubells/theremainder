
-- =====================================================
-- Platform Metrics: counters and timers
-- =====================================================
CREATE TABLE public.platform_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_type text NOT NULL DEFAULT 'counter', -- counter, timer, gauge
  value numeric NOT NULL DEFAULT 1,
  tags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partition-friendly index for time-range queries
CREATE INDEX idx_platform_metrics_name_created ON platform_metrics (metric_name, created_at DESC);
CREATE INDEX idx_platform_metrics_created ON platform_metrics (created_at DESC);

-- Enable RLS (admin-only read, system write via SECURITY DEFINER)
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read metrics"
  ON public.platform_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Alert Rules: configurable thresholds
-- =====================================================
CREATE TABLE public.alert_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  metric_name text NOT NULL,
  condition text NOT NULL DEFAULT 'count_gt', -- count_gt, rate_gt, avg_gt
  threshold numeric NOT NULL,
  window_minutes integer NOT NULL DEFAULT 5,
  severity text NOT NULL DEFAULT 'warning', -- info, warning, critical
  is_active boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  tags_filter jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert rules"
  ON public.alert_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Alert Events: fired alerts
-- =====================================================
CREATE TABLE public.alert_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid NOT NULL REFERENCES alert_rules(id),
  rule_name text NOT NULL,
  severity text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  threshold numeric NOT NULL,
  message text,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_events_created ON alert_events (created_at DESC);
CREATE INDEX idx_alert_events_severity ON alert_events (severity, created_at DESC);

ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alert events"
  ON public.alert_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alert events"
  ON public.alert_events FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Helper: emit_metric (SECURITY DEFINER for edge fns)
-- =====================================================
CREATE OR REPLACE FUNCTION public.emit_metric(
  p_name text,
  p_value numeric DEFAULT 1,
  p_type text DEFAULT 'counter',
  p_tags jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO platform_metrics (metric_name, metric_type, value, tags)
  VALUES (p_name, p_type, p_value, p_tags);
END;
$$;

-- =====================================================
-- Helper: get metric count/avg in a window
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_metric_aggregate(
  p_name text,
  p_window_minutes integer,
  p_agg text DEFAULT 'count',
  p_tags_filter jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result numeric;
BEGIN
  IF p_agg = 'count' THEN
    SELECT COUNT(*) INTO v_result
    FROM platform_metrics
    WHERE metric_name = p_name
      AND created_at >= now() - (p_window_minutes || ' minutes')::interval
      AND (p_tags_filter = '{}'::jsonb OR tags @> p_tags_filter);
  ELSIF p_agg = 'sum' THEN
    SELECT COALESCE(SUM(value), 0) INTO v_result
    FROM platform_metrics
    WHERE metric_name = p_name
      AND created_at >= now() - (p_window_minutes || ' minutes')::interval
      AND (p_tags_filter = '{}'::jsonb OR tags @> p_tags_filter);
  ELSIF p_agg = 'avg' THEN
    SELECT COALESCE(AVG(value), 0) INTO v_result
    FROM platform_metrics
    WHERE metric_name = p_name
      AND created_at >= now() - (p_window_minutes || ' minutes')::interval
      AND (p_tags_filter = '{}'::jsonb OR tags @> p_tags_filter);
  ELSE
    v_result := 0;
  END IF;
  RETURN v_result;
END;
$$;

-- =====================================================
-- Seed default alert rules
-- =====================================================
INSERT INTO alert_rules (name, metric_name, condition, threshold, window_minutes, severity, cooldown_minutes) VALUES
  ('Webhook failures spike', 'webhook.error', 'count_gt', 5, 5, 'critical', 30),
  ('Bid rejections spike', 'bid.rejected', 'count_gt', 10, 10, 'warning', 30),
  ('Payment errors spike', 'payment.error', 'count_gt', 3, 5, 'critical', 30),
  ('High webhook latency', 'webhook.latency_ms', 'avg_gt', 5000, 5, 'warning', 60),
  ('Checkout errors spike', 'checkout.error', 'count_gt', 5, 10, 'warning', 30);

-- Cleanup: auto-delete metrics older than 30 days (via cron later)
