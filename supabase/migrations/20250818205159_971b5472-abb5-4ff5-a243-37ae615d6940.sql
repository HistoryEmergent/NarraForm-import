-- Migrate existing episode sections to individual chapters
INSERT INTO public.chapters (
  project_id,
  episode_id,
  title,
  original_text,
  type,
  content_type,
  chapter_order
)
SELECT 
  e.project_id,
  e.id as episode_id,
  COALESCE(
    section_data->>'title', 
    'Chapter from ' || e.title
  ) as title,
  COALESCE(
    section_data->>'content', 
    e.original_content,
    ''
  ) as original_text,
  COALESCE(
    section_data->>'type', 
    'chapter'
  )::text as type,
  CASE 
    WHEN p.content_type = 'screenplay' THEN 'screenplay'
    ELSE 'novel'
  END as content_type,
  row_number() OVER (PARTITION BY e.id ORDER BY section_index) as chapter_order
FROM public.episodes e
JOIN public.projects p ON e.project_id = p.id
LEFT JOIN LATERAL (
  SELECT 
    section_data,
    row_number() OVER () as section_index
  FROM jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(e.sections) = 'array' THEN e.sections
      ELSE '[]'::jsonb
    END
  ) AS section_data
) sections ON true
WHERE e.sections IS NOT NULL
  AND (
    jsonb_typeof(e.sections) = 'array' 
    AND jsonb_array_length(e.sections) > 0
    AND sections.section_data->>'content' IS NOT NULL
    AND sections.section_data->>'content' != ''
  )
  -- Only migrate if no chapters exist for this episode yet
  AND NOT EXISTS (
    SELECT 1 FROM public.chapters c 
    WHERE c.episode_id = e.id
  );