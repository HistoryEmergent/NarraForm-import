-- Simplify demo projects by adding is_demo flag to projects table
ALTER TABLE public.projects ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;

-- Copy any existing demo_projects to projects table marked as demo
INSERT INTO public.projects (
  user_id, title, description, content_type, output_medium, 
  purpose, original_language, output_language, is_demo
)
SELECT 
  created_by, title, description, content_type, output_medium,
  purpose, original_language, output_language, true
FROM public.demo_projects 
WHERE is_active = true;

-- Update handle_new_user function to copy demo projects from projects table
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

  -- Copy all demo projects (marked with is_demo = true) to the new user
  FOR demo_project IN 
    SELECT * FROM public.projects WHERE is_demo = true
  LOOP
    -- Create a copy of the demo project for this user
    INSERT INTO public.projects (
      user_id, title, description, content_type, output_medium, 
      purpose, original_language, output_language, is_demo
    )
    VALUES (
      NEW.id,
      demo_project.title,
      demo_project.description,
      demo_project.content_type,
      demo_project.output_medium,
      demo_project.purpose,
      demo_project.original_language,
      demo_project.output_language,
      false  -- User copies are not demo projects
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