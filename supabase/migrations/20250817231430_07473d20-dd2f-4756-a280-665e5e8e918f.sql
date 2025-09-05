-- Add original_template_id column to store reference to default templates
ALTER TABLE public.prompts 
ADD COLUMN original_template_id text;