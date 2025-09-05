-- Fix the search_path issue for the trigger function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';