-- Create demo_projects table
CREATE TABLE public.demo_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'novel',
  output_medium TEXT DEFAULT 'audio_drama',
  purpose TEXT NOT NULL DEFAULT 'transform_medium',
  original_language TEXT,
  output_language TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create user roles system for admin management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.demo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for demo_projects
CREATE POLICY "Admins can manage demo projects"
ON public.demo_projects
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active demo projects"
ON public.demo_projects
FOR SELECT
USING (is_active = true);

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

-- Create trigger for updated_at on demo_projects
CREATE TRIGGER update_demo_projects_updated_at
BEFORE UPDATE ON public.demo_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();