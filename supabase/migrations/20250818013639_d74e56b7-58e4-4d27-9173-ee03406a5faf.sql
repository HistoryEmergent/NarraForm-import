-- Delete any duplicate episodes, keeping only the one with the most recent created_at
DELETE FROM episodes 
WHERE title = 'Imported Content' 
AND id NOT IN (
  SELECT id FROM episodes 
  WHERE title = 'Imported Content' 
  ORDER BY created_at DESC 
  LIMIT 1
);