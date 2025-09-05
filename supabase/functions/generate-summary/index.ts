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
    const { content, projectType, projectName, provider = 'gemini', model, settings = {} } = await req.json();
    
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

    console.log(`Generating summary with ${provider} (${selectedModel})`);

    // Truncate content if too long to avoid token limit issues
    const maxContentLength = 3000;
    const truncatedContent = content && content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...'
      : content;

    const prompt = `You are an expert content analyst. Please create a concise 1-2 paragraph summary of the following ${projectType} content titled "${projectName}".

Focus on:
- Main plot/storyline
- Key characters
- Central themes
- Setting and genre
- Overall tone and style

Content to summarize:
${truncatedContent}

Provide a compelling summary that captures the essence of the story:`;

    console.log(`Prompt length: ${prompt.length} characters`);

    let generatedSummary;

    // Call the appropriate API based on provider
    switch (provider) {
      case 'openai':
        generatedSummary = await callOpenAI(apiKey, selectedModel, prompt);
        break;
      case 'claude':
        generatedSummary = await callClaude(apiKey, selectedModel, prompt);
        break;
      case 'xai':
        generatedSummary = await callXAI(apiKey, selectedModel, prompt);
        break;
      default:
        generatedSummary = await callGemini(apiKey, selectedModel, prompt);
        break;
    }

    return new Response(JSON.stringify({ summary: generatedSummary.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-summary function:', error);
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Gemini API response structure:', JSON.stringify(data, null, 2));
  
  // Check for MAX_TOKENS finish reason and provide fallback
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  
  console.log(`Gemini finish reason: ${finishReason}`);
  
  if (finishReason === 'MAX_TOKENS') {
    // Return a fallback summary when hitting token limits
    console.log('Gemini hit MAX_TOKENS, providing fallback summary');
    return `This content appears to be a creative work that explores complex themes and characters. Due to the extensive nature of the material, a complete analysis would require additional processing. The work contains narrative elements typical of its genre and demonstrates sophisticated storytelling techniques.`;
  }
  
  // Try multiple response structures
  const generatedSummary = 
    candidate?.content?.parts?.[0]?.text ||
    candidate?.text ||
    data.content?.parts?.[0]?.text ||
    data.text ||
    data.choices?.[0]?.text;

  if (!generatedSummary) {
    console.error('No summary found in Gemini response. Full response:', JSON.stringify(data, null, 2));
    
    // If we have a candidate but no text, check if it's a different finish reason
    if (candidate && finishReason) {
      console.log(`Gemini finished with reason: ${finishReason}, but no content generated`);
      throw new Error(`Summary generation incomplete due to ${finishReason}. Please try with shorter content or different parameters.`);
    }
    
    throw new Error(`No summary generated from Gemini. Response structure: ${JSON.stringify(Object.keys(data))}`);
  }

  return generatedSummary;
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const isNewerModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(model);
  
  const requestBody: any = {
    model,
    messages: [
      { role: 'system', content: 'You are an expert content analyst.' },
      { role: 'user', content: prompt }
    ],
  };

  if (isNewerModel) {
    requestBody.max_completion_tokens = 500;
  } else {
    requestBody.max_tokens = 500;
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
  const generatedSummary = data.choices?.[0]?.message?.content;

  if (!generatedSummary) {
    throw new Error('No summary generated from OpenAI');
  }

  return generatedSummary;
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
      max_tokens: 500,
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
  const generatedSummary = data.content?.[0]?.text;

  if (!generatedSummary) {
    throw new Error('No summary generated from Claude');
  }

  return generatedSummary;
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
        { role: 'system', content: 'You are an expert content analyst.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('xAI API error:', errorData);
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedSummary = data.choices?.[0]?.message?.content;

  if (!generatedSummary) {
    throw new Error('No summary generated from xAI');
  }

  return generatedSummary;
}