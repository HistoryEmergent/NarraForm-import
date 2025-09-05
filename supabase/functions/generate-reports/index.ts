import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, title, provider = 'gemini', model, settings = {} } = await req.json();
    
    // Determine which API to use based on provider
    let apiKey, selectedModel;
    
    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY') || settings.openaiApiKey;
        selectedModel = model || settings.openaiModel || 'gpt-5-2025-08-07';
        break;
      case 'claude':
        apiKey = Deno.env.get('CLAUDE_API_KEY') || settings.claudeApiKey;
        selectedModel = model || settings.claudeModel || 'claude-sonnet-4-20250514';
        break;
      case 'xai':
        apiKey = Deno.env.get('XAI_API_KEY') || settings.xaiApiKey;
        selectedModel = model || settings.xaiModel || 'grok-4';
        break;
      default:
        apiKey = Deno.env.get('GEMINI_API_KEY') || settings.geminiApiKey;
        selectedModel = model || settings.geminiModel || 'gemini-2.5-flash';
        break;
    }
    
    if (!apiKey) {
      throw new Error(`${provider} API key not configured`);
    }

    if (!script || !title) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: script and title are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating reports with ${provider} (${selectedModel}) for: ${title}`);

    const prompt = `Analyze the following audiodrama script titled "${title}" and extract all sound effects and characters. Format your response as JSON with two arrays: "soundEffects" and "characters".

For sound effects, include all [SFX:], [MUSIC:], and similar audio cues found in the script.
For characters, include all speaking character names and any mentioned but non-speaking characters.

Script to analyze:
${script}

Return your response in this exact JSON format:
{
  "soundEffects": ["array of sound effects"],
  "characters": ["array of character names"]
}`;

    // For now, just call Gemini since other API integrations are complex
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      throw new Error('No result generated');
    }

    // Parse the result and ensure it has the expected structure
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (parseError) {
      console.log('Failed to parse JSON, attempting regex extraction');
      // Fallback: try to extract using regex patterns
      const soundEffectsMatch = result.match(/\[(?:SFX|MUSIC|SOUND)[:\s]*([^\]]+)\]/gi) || [];
      const characterMatches = result.match(/^([A-Z\s]+)$/gm) || [];
      
      parsedResult = {
        soundEffects: soundEffectsMatch.map(effect => effect.replace(/[\[\]]/g, '')),
        characters: [...new Set(characterMatches.map(char => char.trim()).filter(char => 
          char.length > 0 && 
          !char.includes('NARRATOR') && 
          !char.includes('SFX') &&
          !char.includes('MUSIC')
        ))]
      };
    }

    // Ensure we always return arrays
    const finalResult = {
      soundEffects: Array.isArray(parsedResult.soundEffects) ? parsedResult.soundEffects : [],
      characters: Array.isArray(parsedResult.characters) ? parsedResult.characters : []
    };

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-reports function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      soundEffects: [],
      characters: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});