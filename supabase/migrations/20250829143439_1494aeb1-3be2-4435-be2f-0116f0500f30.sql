-- Add original_demo_project_id field to track demo project origins
ALTER TABLE public.projects 
ADD COLUMN original_demo_project_id UUID REFERENCES public.projects(id);

-- Create function to fix episode chapter references for copied demo projects
CREATE OR REPLACE FUNCTION public.fix_demo_project_episode_references()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_record RECORD;
  episode_record RECORD;
  original_chapter_id UUID;
  new_chapter_id UUID;
  updated_chapter_ids JSONB;
BEGIN
  -- For each copied demo project (not demo itself but has no original_demo_project_id set)
  FOR project_record IN 
    SELECT DISTINCT p.id as project_id, dp.id as demo_project_id
    FROM public.projects p
    JOIN public.projects dp ON dp.is_demo = true
    WHERE p.is_demo = false 
    AND p.title = dp.title 
    AND p.original_demo_project_id IS NULL
  LOOP
    -- Update the project to reference its demo origin
    UPDATE public.projects 
    SET original_demo_project_id = project_record.demo_project_id
    WHERE id = project_record.project_id;
    
    -- Fix episode chapter references
    FOR episode_record IN 
      SELECT * FROM public.episodes WHERE project_id = project_record.project_id
    LOOP
      updated_chapter_ids := '[]'::jsonb;
      
      -- For each chapter_id in the episode, find the corresponding copied chapter
      FOR original_chapter_id IN 
        SELECT jsonb_array_elements_text(episode_record.chapter_ids)::uuid
      LOOP
        SELECT c.id INTO new_chapter_id
        FROM public.chapters c
        WHERE c.project_id = project_record.project_id
        AND c.title = (
          SELECT original_c.title 
          FROM public.chapters original_c 
          WHERE original_c.id = original_chapter_id
        )
        LIMIT 1;
        
        IF new_chapter_id IS NOT NULL THEN
          updated_chapter_ids := updated_chapter_ids || to_jsonb(new_chapter_id::text);
        END IF;
      END LOOP;
      
      -- Update the episode with corrected chapter references
      UPDATE public.episodes 
      SET chapter_ids = updated_chapter_ids
      WHERE id = episode_record.id;
    END LOOP;
  END LOOP;
END;
$$;

-- Run the fix function
SELECT public.fix_demo_project_episode_references();

-- Update the handle_new_user function to properly copy demo projects with correct references
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
  new_episode_id UUID;
  chapter_id_mapping JSONB := '{}'::JSONB;
  updated_chapter_ids JSONB;
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
      purpose, original_language, output_language, is_demo, original_demo_project_id
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
      false,  -- User copies are not demo projects
      demo_project.id  -- Track the original demo project
    )
    RETURNING id INTO new_project_id;

    -- Reset chapter mapping for this project
    chapter_id_mapping := '{}'::JSONB;

    -- Copy demo chapters first and build mapping
    FOR demo_chapter IN 
      SELECT * FROM public.chapters WHERE project_id = demo_project.id ORDER BY chapter_order
    LOOP
      INSERT INTO public.chapters (
        project_id, episode_id, title, original_text, processed_text,
        chapter_order, position, type, content_type, character_count
      )
      VALUES (
        new_project_id,
        NULL, -- Will be updated when episodes are copied
        demo_chapter.title,
        demo_chapter.original_text,
        demo_chapter.processed_text,
        demo_chapter.chapter_order,
        demo_chapter.position,
        demo_chapter.type,
        demo_chapter.content_type,
        LENGTH(COALESCE(demo_chapter.original_text, ''))
      )
      RETURNING id INTO new_episode_id; -- Reusing variable for chapter id
      
      -- Store chapter ID mapping
      chapter_id_mapping := chapter_id_mapping || jsonb_build_object(demo_chapter.id::text, new_episode_id::text);
    END LOOP;

    -- Copy demo episodes with corrected chapter references
    FOR demo_episode IN 
      SELECT * FROM public.episodes WHERE project_id = demo_project.id ORDER BY episode_order
    LOOP
      -- Build updated chapter_ids array using the mapping
      updated_chapter_ids := '[]'::jsonb;
      
      SELECT jsonb_agg(chapter_id_mapping->>chapter_id)
      INTO updated_chapter_ids
      FROM jsonb_array_elements_text(demo_episode.chapter_ids) AS chapter_id
      WHERE chapter_id_mapping ? chapter_id;
      
      IF updated_chapter_ids IS NULL THEN
        updated_chapter_ids := '[]'::jsonb;
      END IF;
      
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
        updated_chapter_ids
      )
      RETURNING id INTO new_episode_id;
      
      -- Update chapters to reference the new episode
      UPDATE public.chapters 
      SET episode_id = new_episode_id 
      WHERE project_id = new_project_id 
      AND id = ANY(
        SELECT (jsonb_array_elements_text(updated_chapter_ids))::uuid
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;