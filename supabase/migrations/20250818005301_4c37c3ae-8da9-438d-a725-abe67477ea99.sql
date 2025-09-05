-- Let's try a safer approach to clean up sections
-- First, let's update sections by rebuilding the array with only non-empty chapters

UPDATE episodes 
SET sections = '[
  {
    "id": "chapter-1", 
    "title": "1 - It''s Up to Us Now",
    "content": "' || REPLACE(original_content, '''', '''''') || '",
    "type": "chapter",
    "contentType": "novel"
  }
]'::jsonb
WHERE title = 'Imported Content'
AND id = '20cc6d91-23ae-4714-a07c-c7f725473ef4'
AND LENGTH(COALESCE(original_content, '')) > 100;