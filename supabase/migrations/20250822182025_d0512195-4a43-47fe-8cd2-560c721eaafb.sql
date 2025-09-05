-- Add purpose field to projects table
ALTER TABLE public.projects 
ADD COLUMN purpose text NOT NULL DEFAULT 'transform_medium' 
CHECK (purpose IN ('transform_medium', 'translate_language'));

-- Add original_language and output_language fields for translation projects
ALTER TABLE public.projects 
ADD COLUMN original_language text,
ADD COLUMN output_language text;