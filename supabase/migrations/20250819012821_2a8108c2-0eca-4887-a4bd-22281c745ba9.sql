-- Add missing fields to chapters table for inter-episode positioning
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS relative_to_episode UUID DEFAULT NULL;

-- Add index for better performance on positioning queries
CREATE INDEX IF NOT EXISTS idx_chapters_position ON public.chapters(episode_id, position);
CREATE INDEX IF NOT EXISTS idx_chapters_relative_position ON public.chapters(relative_to_episode, position);