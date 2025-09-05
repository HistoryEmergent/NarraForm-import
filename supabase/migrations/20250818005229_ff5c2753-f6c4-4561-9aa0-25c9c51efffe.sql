-- Clean up the sections data to remove chapters with empty or minimal content
-- Keep only chapters that have substantial content

UPDATE episodes 
SET sections = (
  SELECT jsonb_agg(section_data)
  FROM (
    SELECT section_data
    FROM jsonb_array_elements(sections) AS section_data
    WHERE LENGTH(COALESCE(section_data->>'content', section_data->>'originalText', '')) > 100
  ) AS filtered_sections
)
WHERE title = 'Imported Content'
AND id = '20cc6d91-23ae-4714-a07c-c7f725473ef4';