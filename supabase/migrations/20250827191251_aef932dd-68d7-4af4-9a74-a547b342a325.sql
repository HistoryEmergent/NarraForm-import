-- Update the handle_new_user function to automatically copy demo projects
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_project RECORD;
  new_project_id UUID;
  demo_chapter RECORD;
  demo_episode RECORD;
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.email
    )
  );

  -- Copy all active demo projects to the new user
  FOR demo_project IN 
    SELECT * FROM public.demo_projects WHERE is_active = true
  LOOP
    -- Create a copy of the demo project for this user
    INSERT INTO public.projects (
      user_id, title, description, content_type, output_medium, 
      purpose, original_language, output_language
    )
    VALUES (
      NEW.id,
      demo_project.title,
      demo_project.description,
      demo_project.content_type,
      demo_project.output_medium,
      demo_project.purpose,
      demo_project.original_language,
      demo_project.output_language
    )
    RETURNING id INTO new_project_id;

    -- Copy demo episodes
    FOR demo_episode IN 
      SELECT * FROM public.episodes WHERE project_id = demo_project.id
    LOOP
      INSERT INTO public.episodes (
        project_id, title, description, episode_order,
        original_content, processed_content, sections, chapter_ids
      )
      VALUES (
        new_project_id,
        demo_episode.title,
        demo_episode.description,
        demo_episode.episode_order,
        demo_episode.original_content,
        demo_episode.processed_content,
        demo_episode.sections,
        demo_episode.chapter_ids
      );
    END LOOP;

    -- Copy demo chapters
    FOR demo_chapter IN 
      SELECT * FROM public.chapters WHERE project_id = demo_project.id
    LOOP
      INSERT INTO public.chapters (
        project_id, episode_id, title, original_text, processed_text,
        chapter_order, position, type, content_type, character_count
      )
      VALUES (
        new_project_id,
        demo_chapter.episode_id,
        demo_chapter.title,
        demo_chapter.original_text,
        demo_chapter.processed_text,
        demo_chapter.chapter_order,
        demo_chapter.position,
        demo_chapter.type,
        demo_chapter.content_type,
        LENGTH(COALESCE(demo_chapter.original_text, ''))
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create admin functions for managing demo projects
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- For now, check if user email contains 'admin' or is a specific admin email
  -- You can customize this logic based on your admin identification needs
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id_param 
    AND (
      email ILIKE '%admin%' 
      OR email = 'your-admin-email@example.com'  -- Replace with actual admin email
    )
  );
END;
$function$;

-- Add RLS policies for demo_projects table
ALTER TABLE public.demo_projects ENABLE ROW LEVEL SECURITY;

-- Admins can manage demo projects
CREATE POLICY "Admins can manage demo projects"
ON public.demo_projects
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Everyone can view active demo projects (for reference)
CREATE POLICY "Anyone can view active demo projects"
ON public.demo_projects
FOR SELECT
USING (is_active = true);