-- Fix is_own_order() to require authentication and prevent NULL comparison issues
CREATE OR REPLACE FUNCTION public.is_own_order(o_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND o_user_id IS NOT NULL 
    AND o_user_id = auth.uid()
$$;