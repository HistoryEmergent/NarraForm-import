-- Fix: Restore correct system prompt for project-prompt function
-- First remove the incorrect one
DELETE FROM public.edge_function_prompts 
WHERE function_name = 'generate-project-prompt' AND is_system = true;

-- Insert the correct system prompt
INSERT INTO public.edge_function_prompts (
  user_id,
  function_name,
  name,
  prompt_content,
  provider,
  model,
  is_system,
  is_active
) VALUES (
  NULL,
  'project-prompt',
  'Default Project Prompt Generation',
  'You are an expert AI prompt engineer specializing in content transformation. Based on the project details below, create a comprehensive, tailored prompt for AI processing.

Project Summary: {summary}
Project Purpose: {purpose}
Input Type: {inputType}
Output Type: {outputType}
Original Language: {originalLanguage}
Output Language: {outputLanguage}

Template to customize: {template}

Please create a detailed prompt that:
1. Clearly defines the transformation task
2. Specifies the desired output format and style
3. Includes relevant context about the content type
4. Provides clear guidelines for quality and consistency
5. Incorporates any language-specific considerations

The prompt should be comprehensive enough to produce consistent, high-quality results.',
  'gemini',
  'gemini-2.5-flash',
  true,
  true
);