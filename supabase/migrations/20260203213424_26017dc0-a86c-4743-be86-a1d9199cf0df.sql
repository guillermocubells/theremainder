-- Fix store_settings RLS policy to respect is_public flag
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view public store settings" ON public.store_settings;

-- Create a proper policy that respects the is_public column
CREATE POLICY "Anyone can view public store settings" 
ON public.store_settings 
FOR SELECT 
USING (is_public = true);

-- Ensure admins can still view all settings (already covered by "Admins can manage store settings" policy)