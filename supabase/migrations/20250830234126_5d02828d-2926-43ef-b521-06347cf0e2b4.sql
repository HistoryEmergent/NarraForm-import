-- Comprehensive fix for demo project episode organization and chapter linking
CREATE OR REPLACE FUNCTION public.fix_demo_projects_comprehensive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_record RECORD;
  episode_record RECORD;
  chapter_record RECORD;
  demo_episode_record RECORD;
  original_chapter_id UUID;
  new_chapter_id UUID;
  updated_chapter_ids JSONB;
  chapter_id_text TEXT;
BEGIN
  -- Step 1: Fix copied demo projects that lack proper references
  FOR project_record IN 
    SELECT DISTINCT p.id as project_id, dp.id as demo_project_id
    FROM public.projects p
    JOIN public.projects dp ON dp.is_demo = true
    WHERE p.is_demo = false 
    AND p.title = dp.title 
    AND (p.original_demo_project_id IS NULL OR p.original_demo_project_id != dp.id)
  LOOP
    -- Update the project to reference its demo origin
    UPDATE public.projects 
    SET original_demo_project_id = project_record.demo_project_id
    WHERE id = project_record.project_id;
    
    RAISE NOTICE 'Updated project % with demo reference to %', project_record.project_id, project_record.demo_project_id;
  END LOOP;

  -- Step 2: Fix episode-chapter relationships for all copied demo projects
  FOR project_record IN 
    SELECT p.id as project_id, p.original_demo_project_id as demo_project_id
    FROM public.projects p
    WHERE p.is_demo = false 
    AND p.original_demo_project_id IS NOT NULL
  LOOP
    RAISE NOTICE 'Processing project % (demo source: %)', project_record.project_id, project_record.demo_project_id;
    
    -- Get all episodes for this copied project
    FOR episode_record IN 
      SELECT * FROM public.episodes 
      WHERE project_id = project_record.project_id
      ORDER BY episode_order
    LOOP
      updated_chapter_ids := '[]'::jsonb;
      
      -- Find the corresponding demo episode to match chapter order
      SELECT * INTO demo_episode_record
      FROM public.episodes 
      WHERE project_id = project_record.demo_project_id 
      AND episode_order = episode_record.episode_order
      LIMIT 1;
      
      IF demo_episode_record.id IS NOT NULL THEN
        -- Find chapters that should belong to this episode based on demo structure
        FOR chapter_record IN 
          SELECT c.*
          FROM public.chapters c
          JOIN public.chapters demo_c ON (
            demo_c.project_id = project_record.demo_project_id 
            AND demo_c.episode_id = demo_episode_record.id
            AND c.title = demo_c.title
            AND c.chapter_order = demo_c.chapter_order
          )
          WHERE c.project_id = project_record.project_id
          ORDER BY c.chapter_order
        LOOP
          -- Update chapter to belong to this episode
          UPDATE public.chapters 
          SET episode_id = episode_record.id
          WHERE id = chapter_record.id;
          
          -- Add chapter ID to episode's chapter_ids array
          updated_chapter_ids := updated_chapter_ids || to_jsonb(chapter_record.id::text);
          
          RAISE NOTICE 'Linked chapter % to episode %', chapter_record.id, episode_record.id;
        END LOOP;
      END IF;
      
      -- Update the episode with corrected chapter references
      UPDATE public.episodes 
      SET chapter_ids = updated_chapter_ids
      WHERE id = episode_record.id;
      
      RAISE NOTICE 'Updated episode % with % chapters', episode_record.id, jsonb_array_length(updated_chapter_ids);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Demo project repair completed successfully';
END;
$function$;

-- Execute the comprehensive repair function
SELECT public.fix_demo_projects_comprehensive();