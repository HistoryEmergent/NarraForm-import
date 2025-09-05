-- Create edge_function_prompts table
CREATE TABLE public.edge_function_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL CHECK (function_name IN ('shot-description', 'summary-generation', 'project-prompt', 'reports-generation')),
  name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'openai', 'claude', 'xai')),
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name, name)
);

-- Enable RLS
ALTER TABLE public.edge_function_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own edge function prompts"
  ON public.edge_function_prompts FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create their own edge function prompts"
  ON public.edge_function_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own edge function prompts"
  ON public.edge_function_prompts FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own edge function prompts"
  ON public.edge_function_prompts FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Create trigger for updated_at
CREATE TRIGGER update_edge_function_prompts_updated_at
  BEFORE UPDATE ON public.edge_function_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system default prompts
INSERT INTO public.edge_function_prompts (user_id, function_name, name, prompt_content, provider, model, is_active, is_system) VALUES
  (
    NULL,
    'shot-description',
    'Default Shot Description',
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
    NULL,
    'summary-generation',
    'Default Summary Generation',
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
  ),
  (
    NULL,
    'reports-generation',
    'Default Reports Generation',
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
  );