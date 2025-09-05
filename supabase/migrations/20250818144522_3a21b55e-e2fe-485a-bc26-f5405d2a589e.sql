-- Create profiles for any existing users in auth.users who don't have profiles
INSERT INTO public.profiles (user_id, display_name)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email
  )
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id  
WHERE p.user_id IS NULL;

-- Add existing project owners as collaborators in project_collaborators if not already there
INSERT INTO public.project_collaborators (project_id, user_id, role, invited_by)
SELECT 
  p.id,
  p.user_id,
  'owner',
  p.user_id
FROM public.projects p
LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id AND p.user_id = pc.user_id
WHERE pc.user_id IS NULL;