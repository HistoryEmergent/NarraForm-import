-- Create trigger function to automatically create profiles on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.email
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger to run the function when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger function to automatically add project creators as owners
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Add the project creator as owner in project_collaborators
  INSERT INTO public.project_collaborators (project_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger for new projects
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- Update project_collaborators RLS policies to be more permissive for viewing
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;
CREATE POLICY "Users can view collaborators for their projects" 
ON public.project_collaborators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.user_id = auth.uid()
  ) 
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_collaborators.project_id 
    AND pc.user_id = auth.uid()
  )
);

-- Update projects RLS policy to work with collaborators table  
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
CREATE POLICY "Users can view accessible projects" 
ON public.projects 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = projects.id 
    AND pc.user_id = auth.uid()
  )
);