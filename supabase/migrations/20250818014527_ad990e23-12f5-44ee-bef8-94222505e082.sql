-- Fix the RLS policy for projects table to allow authenticated users to create projects
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = public.projects.user_id);

-- Clean up duplicate episodes, keeping only the most recent one
DELETE FROM public.episodes 
WHERE title = 'Imported Content' 
AND id NOT IN (
  SELECT id FROM public.episodes 
  WHERE title = 'Imported Content' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Verify the policy is working by checking if we can access projects
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'auth_uid', auth.uid(),
    'session_valid', auth.uid() IS NOT NULL,
    'current_time', now()
  );
END;
$$;