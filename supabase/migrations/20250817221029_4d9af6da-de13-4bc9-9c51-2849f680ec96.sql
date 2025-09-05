-- Fix infinite recursion in policies by simplifying the script_versions access control

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view script versions for their projects" ON public.script_versions;
DROP POLICY IF EXISTS "Users can create script versions for their projects" ON public.script_versions;
DROP POLICY IF EXISTS "Users can update script versions for their projects" ON public.script_versions;

-- Create simpler policies that don't cause recursion
CREATE POLICY "Users can view script versions they created or for projects they collaborate on" 
ON public.script_versions 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = script_versions.project_id 
    AND pc.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create script versions for projects they collaborate on" 
ON public.script_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = script_versions.project_id 
    AND pc.user_id = auth.uid()
    AND pc.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Users can update script versions they created" 
ON public.script_versions 
FOR UPDATE 
USING (created_by = auth.uid());

-- Also ensure the projects table has simple policies
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Create simple project policies without recursion
CREATE POLICY "Users can view projects they collaborate on" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = projects.id 
    AND pc.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update projects" 
ON public.projects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = projects.id 
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
    WHERE pc.project_id = projects.id 
    AND pc.user_id = auth.uid()
    AND pc.role = 'owner'
  )
);