-- Fix security warning for function search path
CREATE OR REPLACE FUNCTION public.can_user_access_episode(episode_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, just check if user is authenticated since we don't have project structure yet
  -- This can be expanded later when we have proper project-episode relationships
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_user_access_project(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_id_param 
    AND pc.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';