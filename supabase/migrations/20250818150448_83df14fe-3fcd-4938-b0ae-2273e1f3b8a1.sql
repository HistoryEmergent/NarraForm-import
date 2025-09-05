-- Fix infinite recursion in projects RLS policies by using security definer functions

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

-- Create security definer function to check project access without recursion
CREATE OR REPLACE FUNCTION public.can_user_access_project_safe(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is the project owner or a collaborator
  RETURN EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id_param AND p.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_id_param AND pc.user_id = auth.uid()
  );
END;
$$;

-- Create new safe policy for viewing projects
CREATE POLICY "Users can view accessible projects safe" 
ON public.projects 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  public.can_user_access_project_safe(id)
);