-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a more explicit policy that requires authentication AND ownership
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_own_profile(user_id)
);