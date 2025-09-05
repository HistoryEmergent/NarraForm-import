-- Add character_count column to chapters table
ALTER TABLE public.chapters ADD COLUMN character_count INTEGER DEFAULT 0;

-- Create trigger function to automatically update character_count
CREATE OR REPLACE FUNCTION public.update_chapter_character_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.character_count = LENGTH(COALESCE(NEW.original_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update character_count on INSERT and UPDATE
CREATE TRIGGER trigger_update_chapter_character_count
  BEFORE INSERT OR UPDATE OF original_text ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chapter_character_count();

-- Backfill existing chapters with their current character counts
UPDATE public.chapters 
SET character_count = LENGTH(COALESCE(original_text, ''));