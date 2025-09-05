-- Create storage bucket for shot images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shot-images', 'shot-images', true);

-- Create shot_images table
CREATE TABLE public.shot_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shot_id UUID NOT NULL,
  project_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 1,
  image_type TEXT NOT NULL DEFAULT 'uploaded' CHECK (image_type IN ('uploaded', 'generated')),
  prompt_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shot_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shot_images
CREATE POLICY "Users can view images in their projects" 
ON public.shot_images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shots s
  JOIN chapters c ON s.chapter_id = c.id
  JOIN projects p ON c.project_id = p.id
  WHERE s.id = shot_images.shot_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create images in their projects" 
ON public.shot_images 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM shots s
  JOIN chapters c ON s.chapter_id = c.id
  JOIN projects p ON c.project_id = p.id
  WHERE s.id = shot_images.shot_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update images in their projects" 
ON public.shot_images 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM shots s
  JOIN chapters c ON s.chapter_id = c.id
  JOIN projects p ON c.project_id = p.id
  WHERE s.id = shot_images.shot_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete images in their projects" 
ON public.shot_images 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM shots s
  JOIN chapters c ON s.chapter_id = c.id
  JOIN projects p ON c.project_id = p.id
  WHERE s.id = shot_images.shot_id AND p.user_id = auth.uid()
));

-- Storage policies for shot-images bucket
CREATE POLICY "Shot images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shot-images');

CREATE POLICY "Users can upload shot images to their projects" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shot-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their project shot images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'shot-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their project shot images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'shot-images' 
  AND auth.uid() IS NOT NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_shot_images_updated_at
BEFORE UPDATE ON public.shot_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();