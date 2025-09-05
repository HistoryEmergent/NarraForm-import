-- Add processing_count column to track how many times a chapter has been processed
ALTER TABLE public.chapters 
ADD COLUMN processing_count INTEGER DEFAULT 0;

-- Create an index for better performance when filtering by processing status
CREATE INDEX idx_chapters_processing_count ON public.chapters(processing_count);

-- Update existing chapters to set processing_count based on current processed_text
UPDATE public.chapters 
SET processing_count = CASE 
  WHEN processed_text IS NOT NULL AND processed_text != '' THEN 1 
  ELSE 0 
END;

-- Create a trigger function to automatically increment processing_count when processed_text is updated
CREATE OR REPLACE FUNCTION public.update_chapter_processing_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if processed_text is being set to a non-empty value
  IF (OLD.processed_text IS NULL OR OLD.processed_text = '') 
     AND NEW.processed_text IS NOT NULL AND NEW.processed_text != '' THEN
    NEW.processing_count = COALESCE(OLD.processing_count, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_chapter_processing_count
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chapter_processing_count();