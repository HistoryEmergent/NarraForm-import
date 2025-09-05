-- Restore system prompt for generate-project-prompt function
INSERT INTO public.edge_function_prompts (
  function_name,
  name,
  prompt_content,
  is_system,
  is_active,
  provider,
  model
) VALUES (
  'generate-project-prompt',
  'Default Project Prompt Generator',
  'You are a professional content transformation expert. Based on the project details provided, generate a comprehensive prompt that will guide AI to transform the source content according to the specified requirements.

Project Context:
- Content Type: {content_type}
- Output Medium: {output_medium}
- Purpose: {purpose}
- Original Language: {original_language}
- Output Language: {output_language}

Create a detailed prompt that:
1. Clearly explains the transformation task
2. Provides specific formatting guidelines for the output medium
3. Maintains the original content''s essence while adapting it appropriately
4. Includes any necessary style, tone, or structural requirements
5. Addresses language conversion if needed

Generate a prompt that will produce high-quality, professional results for this specific transformation.',
  true,
  true,
  'gemini',
  'gemini-2.5-flash'
);