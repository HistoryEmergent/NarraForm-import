-- Clean up duplicate chapters by extracting unique chapters from sections
-- This will keep only unique chapters based on their ID

UPDATE episodes 
SET sections = (
  SELECT jsonb_agg(section_data) 
  FROM (
    SELECT DISTINCT ON (section_data->>'id') section_data
    FROM (
      SELECT jsonb_array_elements(sections) AS section_data
      FROM episodes 
      WHERE title = 'Imported Content'
    ) sub
    ORDER BY section_data->>'id'
  ) unique_sections
)
WHERE title = 'Imported Content';