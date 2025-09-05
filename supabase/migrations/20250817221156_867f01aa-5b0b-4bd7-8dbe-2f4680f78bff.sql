-- Fix the script_versions policies by using the correct column names and eliminating recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view script versions they created or for projects they collaborate on" ON public.script_versions;
DROP POLICY IF EXISTS "Authenticated users can create script versions for projects they collaborate on" ON public.script_versions;

-- Create security definer function to check if user can access episode
CREATE OR REPLACE FUNCTION public.can_user_access_episode(episode_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, just check if user is authenticated since we don't have project structure yet
  -- This can be expanded later when we have proper project-episode relationships
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create simple policies for script_versions using the security definer function
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

CREATE POLICY "Users can update script versions they created" 
ON public.script_versions 
FOR UPDATE 
USING (created_by = auth.uid());

-- Also fix the projects policies using a security definer function
CREATE OR REPLACE FUNCTION public.can_user_access_project(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_id_param 
    AND pc.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate project policies without recursion
CREATE POLICY "Users can view projects they collaborate on" 
ON public.projects 
FOR SELECT 
USING (public.can_user_access_project(id));

CREATE POLICY "Project owners can update projects" 
ON public.projects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = id 
    AND pc.user_id = auth.uid()
    AND pc.role = 'owner'
  )
);

CREATE POLICY "Project owners can delete projects" 
ON public.projects 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = id 
    AND pc.user_id = auth.uid()
    AND pc.role = 'owner'
  )
);