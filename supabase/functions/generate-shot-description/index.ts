import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selectedText, context, shotType, contentType, provider, model, settings = {} } = await req.json();
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from request headers
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }

    if (!selectedText || !shotType) {
      throw new Error('Missing required parameters: selectedText and shotType are required');
    }

    // Get active prompt for this function and user, or fallback to system default
    let promptContent = '';
    let selectedProvider = provider || 'gemini';
    let selectedModel = model;

    if (userId) {
      const { data: userPrompt } = await supabase
        .from('edge_function_prompts')
        .select('*')
        .eq('user_id', userId)
        .eq('function_name', 'shot-description')
        .eq('is_active', true)
        .single();

      if (userPrompt) {
        promptContent = userPrompt.prompt_content;
        selectedProvider = userPrompt.provider;
        selectedModel = userPrompt.model;
      }
    }

    // Fallback to system default if no user prompt found
    if (!promptContent) {
      const { data: systemPrompt, error: systemError } = await supabase
        .from('edge_function_prompts')
        .select('*')
        .eq('function_name', 'shot-description')
        .eq('is_system', true)
        .single();

      if (systemError) {
        console.error('Error fetching system prompt:', systemError);
      }

      if (systemPrompt) {
        promptContent = systemPrompt.prompt_content;
        selectedProvider = systemPrompt.provider;
        selectedModel = systemPrompt.model;
        console.log(`Using system prompt: ${systemPrompt.name}`);
      }
    }

    // Final fallback to hardcoded prompt
    if (!promptContent) {
      promptContent = `Based on this text from a {contentType}: "{selectedText}"

Context (surrounding text): "{context}"

Generate a detailed description of what would be seen in a {shotType} shot for this scene. Focus on:
- Visual elements that would be visible in the frame
- Character positioning and actions
- Setting and environment details
- Lighting and mood
- Objects and props in the shot
- Camera perspective appropriate for a {shotType}

Be specific and cinematic in your description. This will be used for storyboard creation.`;
      selectedProvider = provider || 'gemini';
      selectedModel = model || 'gemini-2.5-flash';
    }

    // Truncate context if too long to avoid token limit issues
    const maxContextLength = 500;
    const truncatedContext = context && context.length > maxContextLength 
      ? context.substring(0, maxContextLength) + '...'
      : context;
    
    // Replace placeholders in prompt
    const prompt = promptContent
      .replace(/\{shotType\}/g, shotType)
      .replace(/\{context\}/g, truncatedContext || '')
      .replace(/\{selectedText\}/g, selectedText)
      .replace(/\{contentType\}/g, contentType);
      
    console.log(`Prompt length: ${prompt.length} characters`);

    console.log(`Generating shot description with ${selectedProvider} (${selectedModel}) for shot type: ${shotType}`);

    // Determine API key
    let apiKey: string | undefined;
    
    switch (selectedProvider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY') || settings.openaiApiKey;
        if (!selectedModel) selectedModel = settings.openaiModel || 'gpt-5-2025-08-07';
        break;
      case 'claude':
        apiKey = Deno.env.get('CLAUDE_API_KEY') || settings.claudeApiKey;
        if (!selectedModel) selectedModel = settings.claudeModel || 'claude-3-5-sonnet-20241022';
        break;
      case 'xai':
        apiKey = Deno.env.get('XAI_API_KEY') || settings.xaiApiKey;
        if (!selectedModel) selectedModel = settings.xaiModel || 'grok-2-1212';
        break;
      default:
        apiKey = Deno.env.get('GEMINI_API_KEY') || settings.geminiApiKey;
        if (!selectedModel) selectedModel = settings.geminiModel || 'gemini-2.5-flash';
        break;
    }
    
    console.log(`API key available for ${selectedProvider}:`, !!apiKey);
    
    if (!apiKey) {
      throw new Error(`${selectedProvider} API key not configured`);
    }

    let generatedDescription;

    // Call the appropriate API based on provider
    switch (selectedProvider) {
      case 'openai':
        generatedDescription = await callOpenAI(apiKey, selectedModel, prompt);
        break;
      case 'claude':
        generatedDescription = await callClaude(apiKey, selectedModel, prompt);
        break;
      case 'xai':
        generatedDescription = await callXAI(apiKey, selectedModel, prompt);
        break;
      default:
        generatedDescription = await callGemini(apiKey, selectedModel, prompt);
        break;
    }

    return new Response(JSON.stringify({ description: generatedDescription.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-shot-description function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callGemini(apiKey: string, model: string, prompt: string) {
  console.log(`Making Gemini API call with model: ${model}`);
  
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    })
  });

  console.log(`Gemini API response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error response:', errorData);
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Gemini API response structure:', JSON.stringify(data, null, 2));
  
  // Check for MAX_TOKENS finish reason and provide fallback
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  
  console.log(`Gemini finish reason: ${finishReason}`);
  
  if (finishReason === 'MAX_TOKENS') {
    // Return a fallback description when hitting token limits
    console.log('Gemini hit MAX_TOKENS, providing fallback description');
    return `Shot description: A ${prompt.includes('CLOSE_UP') ? 'close-up' : prompt.includes('WIDE_SHOT') ? 'wide' : 'medium'} shot showing the scene described in the source text. The frame captures the essential visual elements, character positioning, and environmental details appropriate for this moment in the story.`;
  }
  
  // Try multiple response structures
  let generatedDescription = 
    candidate?.content?.parts?.[0]?.text ||
    candidate?.text ||
    data.content?.parts?.[0]?.text ||
    data.text ||
    data.choices?.[0]?.text;

  if (!generatedDescription) {
    console.error('No description found in Gemini response. Full response:', JSON.stringify(data, null, 2));
    
    // If we have a candidate but no text, check if it's a different finish reason
    if (candidate && finishReason) {
      console.log(`Gemini finished with reason: ${finishReason}, but no content generated`);
      return `Shot description generation incomplete due to ${finishReason}. Please try with shorter context or different parameters.`;
    }
    
    throw new Error(`No description generated from Gemini. Response structure: ${JSON.stringify(Object.keys(data))}`);
  }

  console.log('Successfully extracted description from Gemini');
  return generatedDescription;
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const isNewerModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(model);
  
  const requestBody: any = {
    model,
    messages: [
      { role: 'system', content: 'You are an expert cinematographer and storyboard artist.' },
      { role: 'user', content: prompt }
    ],
  };

  if (isNewerModel) {
    requestBody.max_completion_tokens = 800;
  } else {
    requestBody.max_tokens = 800;
    requestBody.temperature = 0.7;
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
  const generatedDescription = data.choices?.[0]?.message?.content;

  if (!generatedDescription) {
    throw new Error('No description generated from OpenAI');
  }

  return generatedDescription;
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
      max_tokens: 800,
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
  const generatedDescription = data.content?.[0]?.text;

  if (!generatedDescription) {
    throw new Error('No description generated from Claude');
  }

  return generatedDescription;
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
        { role: 'system', content: 'You are an expert cinematographer and storyboard artist.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('xAI API error:', errorData);
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedDescription = data.choices?.[0]?.message?.content;

  if (!generatedDescription) {
    throw new Error('No description generated from xAI');
  }

  return generatedDescription;
}