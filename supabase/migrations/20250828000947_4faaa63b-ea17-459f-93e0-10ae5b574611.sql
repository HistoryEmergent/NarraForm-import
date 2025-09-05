-- Insert system default prompts for each edge function
INSERT INTO public.edge_function_prompts (
  user_id,
  function_name,
  name,
  prompt_content,
  provider,
  model,
  is_active,
  is_system
) VALUES 
(
  NULL,
  'shot-description',
  'Default Shot Description Prompt',
  'Based on this text from a {contentType}: "{selectedText}"

Context (surrounding text): "{context}"

Generate a detailed description of what would be seen in a {shotType} shot for this scene. Focus on:
- Visual elements that would be visible in the frame
- Character positioning and actions
- Setting and environment details
- Lighting and mood
- Objects and props in the shot
- Camera perspective appropriate for a {shotType}

Be specific and cinematic in your description. This will be used for storyboard creation.',
  'gemini',
  'gemini-2.5-flash',
  true,
  true
),
(
  NULL,
  'summary-generation',
  'Default Summary Generation Prompt',
  'Summarize the following content for {contentType} adaptation:

{content}

Provide a concise but comprehensive summary that captures the key narrative elements, character development, and thematic content.',
  'gemini',
  'gemini-2.5-flash',
  true,
  true
),
(
  NULL,
  'project-prompt',
  'Default Project Prompt',
  'Generate a detailed project prompt for transforming the following {contentType} content:

{content}

Consider the target medium and provide comprehensive guidance for adaptation.',
  'gemini',
  'gemini-2.5-flash',
  true,
  true
),
(
  NULL,
  'reports-generation',
  'Default Reports Generation Prompt',
  'Generate a comprehensive report for the following project data:

{data}

Include analysis, insights, and recommendations.',
  'gemini',
  'gemini-2.5-flash',
  true,
  true
);