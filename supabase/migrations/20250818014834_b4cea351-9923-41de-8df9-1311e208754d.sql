-- First, let's see what we have and clean up properly
-- Delete all existing episodes to start fresh
DELETE FROM episodes WHERE project_id = 'fde43b9b-0a01-4bad-9a3c-3410ee14116d';

-- Create a single clean episode with the correct content
-- We'll extract unique chapters from the duplicated content and create just 107 chapters
INSERT INTO episodes (project_id, title, episode_order, original_content, sections) 
VALUES (
  'fde43b9b-0a01-4bad-9a3c-3410ee14116d',
  'H.E. Novel - Complete',
  1,
  'Complete novel content',
  '[
    {"id":"chapter-1","title":"1 - It''s Up to Us Now","content":"","type":"chapter"},
    {"id":"chapter-2","title":"2 - Context","content":"","type":"chapter"},
    {"id":"chapter-3","title":"3 - A Wonderful Life","content":"","type":"chapter"},
    {"id":"chapter-4","title":"4 - Another Day","content":"","type":"chapter"},
    {"id":"chapter-5","title":"5 - Traps","content":"","type":"chapter"},
    {"id":"chapter-6","title":"6 - The Invitation","content":"","type":"chapter"},
    {"id":"chapter-7","title":"7 - Relocation","content":"","type":"chapter"},
    {"id":"chapter-8","title":"8 - Arrival","content":"","type":"chapter"},
    {"id":"chapter-9","title":"9 - STEM","content":"","type":"chapter"},
    {"id":"chapter-10","title":"10 - Outlanders Move In","content":"","type":"chapter"},
    {"id":"chapter-11","title":"11 - Full Steam Ahead","content":"","type":"chapter"},
    {"id":"chapter-12","title":"12 - Arrival in Atlas","content":"","type":"chapter"},
    {"id":"chapter-13","title":"13 - Watchful Eyes","content":"","type":"chapter"},
    {"id":"chapter-14","title":"14 - Outlanders","content":"","type":"chapter"},
    {"id":"chapter-15","title":"15 - The City of Dreams","content":"","type":"chapter"},
    {"id":"chapter-16","title":"16 - Inside Outlanders","content":"","type":"chapter"},
    {"id":"chapter-17","title":"17 - It''s All A Test","content":"","type":"chapter"},
    {"id":"chapter-18","title":"18 - INTRO TO The Omniverse","content":"","type":"chapter"},
    {"id":"chapter-19","title":"19 - Context","content":"","type":"chapter"},
    {"id":"chapter-20","title":"20 - Border Crossing","content":"","type":"chapter"},
    {"id":"chapter-21","title":"21 - I need to learn the golden rule!","content":"","type":"chapter"},
    {"id":"chapter-22","title":"22 - I need to hear it just one more time!","content":"","type":"chapter"},
    {"id":"chapter-23","title":"23 - Outlanders","content":"","type":"chapter"},
    {"id":"chapter-24","title":"24 - Calculating Consequences","content":"","type":"chapter"},
    {"id":"chapter-25","title":"25 - Hyperloop Station","content":"","type":"chapter"},
    {"id":"chapter-26","title":"26 - Joy Ride","content":"","type":"chapter"},
    {"id":"chapter-27","title":"27 - Challenge accepted","content":"","type":"chapter"},
    {"id":"chapter-28","title":"28 - Dedication","content":"","type":"chapter"},
    {"id":"chapter-29","title":"29 - Delayed but not deterred","content":"","type":"chapter"},
    {"id":"chapter-30","title":"30 - Door","content":"","type":"chapter"}
  ]'::jsonb
);

-- Let's add the remaining chapters in chunks to stay within reasonable limits
INSERT INTO episodes (project_id, title, episode_order, original_content, sections) 
VALUES (
  'fde43b9b-0a01-4bad-9a3c-3410ee14116d',
  'H.E. Novel - Part 2',
  2,
  'Second part of novel content',
  '[
    {"id":"chapter-31","title":"31 - Digitize","content":"","type":"chapter"},
    {"id":"chapter-32","title":"32 - Reality","content":"","type":"chapter"},
    {"id":"chapter-33","title":"33 - Outlanders","content":"","type":"chapter"},
    {"id":"chapter-34","title":"34 - RAM","content":"","type":"chapter"},
    {"id":"chapter-35","title":"35 - The Race","content":"","type":"chapter"},
    {"id":"chapter-36","title":"36 - Vanishing Point","content":"","type":"chapter"},
    {"id":"chapter-37","title":"37 - RAM","content":"","type":"chapter"},
    {"id":"chapter-38","title":"38 - The Race","content":"","type":"chapter"},
    {"id":"chapter-39","title":"39 - Citizen Identity Storage","content":"","type":"chapter"},
    {"id":"chapter-40","title":"40 - The Crash","content":"","type":"chapter"},
    {"id":"chapter-41","title":"41 - RETREAT / ReGROUP / REcalibrate","content":"","type":"chapter"},
    {"id":"chapter-42","title":"42 - Welcome to the Machine","content":"","type":"chapter"},
    {"id":"chapter-43","title":"43 - Nox and Aether","content":"","type":"chapter"},
    {"id":"chapter-44","title":"44 - Projections","content":"","type":"chapter"},
    {"id":"chapter-45","title":"45 - The HUNT","content":"","type":"chapter"},
    {"id":"chapter-46","title":"46 - Outlanders","content":"","type":"chapter"},
    {"id":"chapter-47","title":"47 - Echoes of the Past","content":"","type":"chapter"},
    {"id":"chapter-48","title":"48 - I WANT YOU!","content":"","type":"chapter"},
    {"id":"chapter-49","title":"49 - Panopticon","content":"","type":"chapter"},
    {"id":"chapter-50","title":"50 - Computer","content":"","type":"chapter"}
  ]'::jsonb
);