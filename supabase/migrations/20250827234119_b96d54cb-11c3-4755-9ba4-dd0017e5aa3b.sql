-- Add new columns to prompt_templates table for edge function support
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini';
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.5-flash';
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add new categories for edge function prompts
ALTER TABLE prompt_templates DROP CONSTRAINT IF EXISTS prompt_templates_category_check;
ALTER TABLE prompt_templates ADD CONSTRAINT prompt_templates_category_check 
  CHECK (category IN ('novel-to-script', 'screenplay-to-script', 'shot-description', 'summary-generation', 'project-prompt', 'reports-generation', 'custom'));

-- Insert default edge function prompt templates
INSERT INTO prompt_templates (name, category, input_type, output_type, template_content, provider, model, is_system, is_active) VALUES
  (
    'Default Shot Description', 
    'shot-description', 
    'text', 
    'description',
    'You are a professional storyboard artist creating visual descriptions for {shotType} shots.

Context: {context}
Selected Text: {selectedText}
Content Type: {contentType}

Please create a detailed visual description for this {shotType} shot that captures:
1. The physical setting and environment
2. Character positioning and expressions
3. Lighting and mood
4. Camera angle and movement
5. Visual elements that support the narrative

Keep the description concise but vivid, focusing on what would be most important for a director or cinematographer to understand.',
    'gemini',
    'gemini-2.5-flash',
    true,
    true
  ),
  (
    'Default Summary Generation', 
    'summary-generation', 
    'text', 
    'summary',
    'Please provide a comprehensive summary of the following {projectType} project titled "{projectName}":

{content}

Create a summary that includes:
1. Main plot points and narrative arc
2. Key characters and their roles
3. Central themes and conflicts
4. Setting and atmosphere
5. Overall tone and style

Keep the summary engaging and informative, suitable for someone who needs to understand the project quickly.',
    'gemini',
    'gemini-2.5-flash',
    true,
    true
  ),
  (
    'Default Project Prompt Generation', 
    'project-prompt', 
    'template', 
    'prompt',
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
  ),
  (
    'Default Reports Generation', 
    'reports-generation', 
    'script', 
    'analysis',
    'Analyze the following audio drama script titled "{title}" and extract comprehensive production information:

{script}

Please provide a detailed JSON response with the following structure:
{
  "soundEffects": [
    {
      "effect": "description of the sound effect",
      "context": "when/where it occurs in the script",
      "intensity": "low/medium/high"
    }
  ],
  "characters": [
    {
      "name": "character name",
      "description": "brief character description",
      "dialogueCount": "approximate number of lines"
    }
  ]
}

Focus on:
1. All sound effects mentioned in brackets [LIKE THIS]
2. Character names in ALL CAPS format
3. Action lines that suggest additional sound needs
4. Environmental sounds implied by the setting

Be thorough but practical for audio production planning.',
    'gemini',
    'gemini-2.5-flash',
    true,
    true
  )
ON CONFLICT (name, category) DO NOTHING;