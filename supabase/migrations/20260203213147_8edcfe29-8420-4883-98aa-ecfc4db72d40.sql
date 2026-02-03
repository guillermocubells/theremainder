-- Add is_public column to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;

-- Create new policy that only allows viewing public settings
CREATE POLICY "Anyone can view public store settings" 
ON public.store_settings 
FOR SELECT 
USING (is_public = true);

-- Admins can still see all settings via their existing "Admins can manage store settings" policy