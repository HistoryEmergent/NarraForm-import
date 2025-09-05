-- Fix infinite recursion in project_collaborators RLS policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;

-- Create security definer function to check if user can view project collaborators
CREATE OR REPLACE FUNCTION public.can_user_view_project_collaborators(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- User can view collaborators if they own the project or are a collaborator themselves
  RETURN EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id_param AND p.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_id_param AND pc.user_id = auth.uid()
  );
END;
$$;

-- Create new safe policy for viewing project collaborators
CREATE POLICY "Users can view collaborators for accessible projects" 
ON public.project_collaborators 
FOR SELECT 
USING (
  public.can_user_view_project_collaborators(project_id) OR 
  user_id = auth.uid()
);

-- Also fix the project owners policy to use a security definer function
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id_param AND p.user_id = auth.uid()
  );
END;
$$;

-- Drop and recreate the project owners policy to use the safe function
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;

CREATE POLICY "Project owners can manage collaborators safe" 
ON public.project_collaborators 
FOR ALL 
USING (public.is_project_owner(project_id))
WITH CHECK (public.is_project_owner(project_id));