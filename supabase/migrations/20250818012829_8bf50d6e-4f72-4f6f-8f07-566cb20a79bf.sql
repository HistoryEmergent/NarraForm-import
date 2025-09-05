-- Clean up duplicate chapters by extracting unique chapters from sections
-- This will keep only the first occurrence of each unique chapter ID

UPDATE episodes 
SET sections = (
  SELECT jsonb_agg(DISTINCT section_data ORDER BY section_data->>'id') 
  FROM (
    SELECT DISTINCT ON (section_data->>'id') section_data
    FROM (
      SELECT jsonb_array_elements(sections) AS section_data
      FROM episodes 
      WHERE title = 'Imported Content'
    ) sub
  ) unique_sections
)
WHERE title = 'Imported Content';