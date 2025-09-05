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
    const { 
      template, 
      summary, 
      projectPurpose, 
      inputType, 
      outputType, 
      originalLanguage, 
      outputLanguage,
      provider = 'gemini',
      settings = {}
    } = await req.json();
    
    // Determine which API to use based on provider
    let apiKey, model;
    
    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY') || settings.openaiApiKey;
        model = settings.openaiModel || 'gpt-5-2025-08-07';
        break;
      case 'claude':
        apiKey = Deno.env.get('CLAUDE_API_KEY') || settings.claudeApiKey;
        model = settings.claudeModel || 'claude-sonnet-4-20250514';
        break;
      case 'xai':
        apiKey = Deno.env.get('XAI_API_KEY') || settings.xaiApiKey;
        model = settings.xaiModel || 'grok-4';
        break;
      default:
        apiKey = Deno.env.get('GEMINI_API_KEY') || settings.geminiApiKey;
        model = settings.geminiModel || 'gemini-2.5-flash';
        break;
    }
    
    if (!apiKey) {
      throw new Error(`${provider} API key not configured`);
    }

    // Replace template placeholders
    let customizedTemplate = template
      .replace(/{summary}/g, summary)
      .replace(/{input_type}/g, inputType)
      .replace(/{output_type}/g, outputType);
    
    if (projectPurpose === 'translate_language') {
      customizedTemplate = customizedTemplate
        .replace(/{original_language}/g, originalLanguage || '')
        .replace(/{output_language}/g, outputLanguage || '');
    }

    const prompt = `You are an expert prompt engineer specializing in content transformation and translation projects. Based on the following template and project details, create a comprehensive, customized prompt that will be used for AI-powered content processing.

Template:
${customizedTemplate}

Project Summary:
${summary}

Instructions:
1. Take the provided template and enhance it with specific details based on the project summary
2. Add relevant context and examples where appropriate
3. Ensure the prompt is clear, detailed, and actionable
4. Maintain the original structure and guidelines from the template
5. Make it specific to this particular project while keeping it professional
6. Include any relevant stylistic or thematic elements from the summary

Generate a robust, customized prompt:`;

    let generatedPrompt;

    // Call the appropriate API based on provider
    switch (provider) {
      case 'openai':
        generatedPrompt = await callOpenAI(apiKey, model, prompt);
        break;
      case 'claude':
        generatedPrompt = await callClaude(apiKey, model, prompt);
        break;
      case 'xai':
        generatedPrompt = await callXAI(apiKey, model, prompt);
        break;
      default:
        generatedPrompt = await callGemini(apiKey, model, prompt);
        break;
    }

    return new Response(JSON.stringify({ prompt: generatedPrompt.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-project-prompt function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callGemini(apiKey: string, model: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1500,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedPrompt) {
    throw new Error('No prompt generated from Gemini');
  }

  return generatedPrompt;
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const isNewerModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(model);
  
  const requestBody: any = {
    model,
    messages: [
      { role: 'system', content: 'You are an expert prompt engineer.' },
      { role: 'user', content: prompt }
    ],
  };

  if (isNewerModel) {
    requestBody.max_completion_tokens = 1500;
  } else {
    requestBody.max_tokens = 1500;
    requestBody.temperature = 0.8;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedPrompt = data.choices?.[0]?.message?.content;

  if (!generatedPrompt) {
    throw new Error('No prompt generated from OpenAI');
  }

  return generatedPrompt;
}

async function callClaude(apiKey: string, model: string, prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Claude API error:', errorData);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedPrompt = data.content?.[0]?.text;

  if (!generatedPrompt) {
    throw new Error('No prompt generated from Claude');
  }

  return generatedPrompt;
}

async function callXAI(apiKey: string, model: string, prompt: string) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert prompt engineer.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.8
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('xAI API error:', errorData);
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedPrompt = data.choices?.[0]?.message?.content;

  if (!generatedPrompt) {
    throw new Error('No prompt generated from xAI');
  }

  return generatedPrompt;
}