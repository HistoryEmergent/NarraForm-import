-- Create chapters table to match application expectations
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  original_text TEXT NOT NULL DEFAULT '',
  processed_text TEXT,
  type TEXT NOT NULL DEFAULT 'chapter' CHECK (type IN ('chapter', 'scene')),
  content_type TEXT NOT NULL DEFAULT 'novel' CHECK (content_type IN ('novel', 'screenplay')),
  chapter_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chapters
CREATE POLICY "Users can view chapters in their projects" 
ON public.chapters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chapters in their projects" 
ON public.chapters 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update chapters in their projects" 
ON public.chapters 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete chapters in their projects" 
ON public.chapters 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing episode sections data to chapters table
DO $$
DECLARE
  episode_record RECORD;
  section_record JSONB;
  chapter_order_counter INTEGER;
BEGIN
  -- Loop through each episode with sections
  FOR episode_record IN 
    SELECT id, project_id, sections, title 
    FROM public.episodes 
    WHERE sections IS NOT NULL AND jsonb_array_length(sections) > 0
  LOOP
    chapter_order_counter := 1;
    
    -- Loop through each section in the episode
    FOR section_record IN 
      SELECT * FROM jsonb_array_elements(episode_record.sections)
    LOOP
      -- Insert section as a chapter
      INSERT INTO public.chapters (
        project_id,
        episode_id,
        title,
        original_text,
        type,
        content_type,
        chapter_order
      ) VALUES (
        episode_record.project_id,
        episode_record.id,
        COALESCE(section_record->>'title', 'Chapter ' || chapter_order_counter),
        COALESCE(section_record->>'content', ''),
        COALESCE(section_record->>'type', 'chapter'),
        'novel', -- Default to novel for existing data
        chapter_order_counter
      );
      
      chapter_order_counter := chapter_order_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON public.chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_episode_id ON public.chapters(episode_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON public.chapters(project_id, chapter_order);

-- Update episodes table structure for consistency
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS chapter_ids JSONB DEFAULT '[]'::jsonb;