-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION public.update_chapter_character_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.character_count = LENGTH(COALESCE(NEW.original_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';