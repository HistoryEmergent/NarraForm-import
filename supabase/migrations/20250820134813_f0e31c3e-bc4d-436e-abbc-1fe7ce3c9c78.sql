-- Add output_medium field to projects table
ALTER TABLE public.projects 
ADD COLUMN output_medium TEXT DEFAULT 'audio_drama'::text;

-- Update existing projects to have default output medium
UPDATE public.projects 
SET output_medium = 'audio_drama' 
WHERE output_medium IS NULL;

-- Add constraint to ensure valid output mediums
ALTER TABLE public.projects 
ADD CONSTRAINT valid_output_medium 
CHECK (output_medium IN ('audio_drama', 'novel', 'screenplay', 'podcast_script', 'radio_drama'));

-- Create export_settings table for user export preferences
CREATE TABLE public.export_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  format TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on export_settings
ALTER TABLE public.export_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for export_settings
CREATE POLICY "Users can view their own export settings"
ON public.export_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export settings"
ON public.export_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export settings"
ON public.export_settings 
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own export settings"
ON public.export_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for export_settings updated_at
CREATE TRIGGER update_export_settings_updated_at
BEFORE UPDATE ON public.export_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();