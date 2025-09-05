-- Fix infinite recursion in projects RLS by creating security definer function
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS SETOF UUID AS $$
BEGIN
  -- Return projects where user is owner or collaborator
  RETURN QUERY
  SELECT DISTINCT p.id
  FROM public.projects p
  LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
  WHERE p.user_id = auth.uid() OR pc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their projects and collaborated projects" ON public.projects;

-- Create new policy using the security definer function
CREATE POLICY "Users can view accessible projects" 
ON public.projects 
FOR SELECT 
USING (id IN (SELECT public.get_user_accessible_projects()));