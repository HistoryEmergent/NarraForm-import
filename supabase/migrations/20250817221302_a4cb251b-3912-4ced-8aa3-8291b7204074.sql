-- Fix the function parameter type and simplify policies

-- Drop the incorrectly typed function
DROP FUNCTION IF EXISTS public.can_user_access_episode(TEXT);

-- Create the function with correct UUID parameter type
CREATE OR REPLACE FUNCTION public.can_user_access_episode(episode_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, just check if user is authenticated since we don't have project structure yet
  -- This can be expanded later when we have proper project-episode relationships
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view script versions for episodes they can access" ON public.script_versions;
DROP POLICY IF EXISTS "Authenticated users can create script versions" ON public.script_versions;

-- Create simple policies for script_versions
CREATE POLICY "Users can view script versions for episodes they can access" 
ON public.script_versions 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  public.can_user_access_episode(episode_id)
);

CREATE POLICY "Authenticated users can create script versions" 
ON public.script_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  public.can_user_access_episode(episode_id)
);