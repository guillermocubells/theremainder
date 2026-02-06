
-- Replace overly permissive INSERT policy with one that requires service_role
-- (edge function uses service role, so anon users can't insert directly)
DROP POLICY IF EXISTS "Service role can insert inquiries" ON public.garden_inquiries;

CREATE POLICY "Insert inquiries via service role only"
  ON public.garden_inquiries FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
