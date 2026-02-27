
-- Fix: Revoke API access to materialized view (admin-only via RPC)
REVOKE ALL ON public.search_metrics_daily FROM anon, authenticated;

-- Fix: Tighten INSERT policies to service-role only (edge functions)
DROP POLICY "Service can insert query logs" ON public.search_query_logs;
DROP POLICY "Service can insert click logs" ON public.search_click_logs;

-- These tables are written by edge functions using service_role key only.
-- No client-side INSERT is needed, so no INSERT policy for anon/authenticated.
