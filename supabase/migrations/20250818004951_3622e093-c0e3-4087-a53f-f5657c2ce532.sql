-- Remove the empty "Imported Content" episode that appears to be a failed import
-- Keep the one with actual content (716209 characters) and remove the nearly empty one (212 characters)

DELETE FROM episodes 
WHERE id = '03aa9d87-4c8a-4dc6-a1bd-5cf36f3ef2e5' 
AND title = 'Imported Content' 
AND LENGTH(COALESCE(original_content, '')) < 1000;