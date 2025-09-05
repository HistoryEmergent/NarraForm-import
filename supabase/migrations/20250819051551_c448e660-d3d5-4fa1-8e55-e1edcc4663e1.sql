-- Add orphaned flag to chapters table for better orphan management
ALTER TABLE public.chapters ADD COLUMN is_orphaned BOOLEAN DEFAULT false;

-- Add index for performance when querying orphaned chapters
CREATE INDEX idx_chapters_orphaned ON public.chapters(is_orphaned) WHERE is_orphaned = true;