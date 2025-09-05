-- Create shots table for shot list functionality
CREATE TABLE public.shots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL,
  project_id UUID NOT NULL,
  shot_order INTEGER NOT NULL DEFAULT 1,
  shot_type TEXT NOT NULL DEFAULT 'MEDIUM_SHOT',
  camera_movement TEXT DEFAULT NULL,
  camera_movement_description TEXT DEFAULT NULL,
  source_text TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'original',
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,
  generated_description TEXT DEFAULT NULL,
  user_description TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- Create policies for shots access
CREATE POLICY "Users can view shots in their projects" 
ON public.shots 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chapters c 
  JOIN public.projects p ON c.project_id = p.id 
  WHERE c.id = shots.chapter_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create shots in their projects" 
ON public.shots 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chapters c 
  JOIN public.projects p ON c.project_id = p.id 
  WHERE c.id = shots.chapter_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update shots in their projects" 
ON public.shots 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.chapters c 
  JOIN public.projects p ON c.project_id = p.id 
  WHERE c.id = shots.chapter_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete shots in their projects" 
ON public.shots 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.chapters c 
  JOIN public.projects p ON c.project_id = p.id 
  WHERE c.id = shots.chapter_id AND p.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_shots_chapter_id ON public.shots(chapter_id);
CREATE INDEX idx_shots_project_id ON public.shots(project_id);
CREATE INDEX idx_shots_order ON public.shots(chapter_id, shot_order);
CREATE INDEX idx_shots_position ON public.shots(chapter_id, start_position);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shots_updated_at
BEFORE UPDATE ON public.shots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();