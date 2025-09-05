import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, params, settings } = await req.json();

    console.log('Image generation request:', { provider, params });

    switch (provider) {
      case 'openai':
        return await generateWithOpenAI(params, settings.openai);
      case 'gemini':
        return await generateWithGemini(params, settings.gemini);
      case 'runware':
        return await generateWithRunware(params, settings.runware);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateWithOpenAI(params: any, openaiSettings: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('Generating with OpenAI:', { params, openaiSettings });

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiSettings.model,
      prompt: params.prompt,
      n: 1,
      size: openaiSettings.size,
      quality: openaiSettings.quality,
      style: openaiSettings.style,
      response_format: 'url'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI API error:', response.status, errorData);
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('OpenAI response received');

  return new Response(
    JSON.stringify({
      success: true,
      imageUrl: data.data[0].url,
      provider: 'openai'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateWithGemini(params: any, geminiSettings: any) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  console.log('Generating with Gemini:', { params, geminiSettings });

  // Use the correct gemini-2.5-flash-image-preview model
  const model = geminiSettings.model || 'gemini-2.5-flash-image-preview';
  
  console.log('Using Gemini model:', model);
  
  // Use the v1beta API endpoint as per documentation
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: params.prompt
        }]
      }]
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gemini API error:', response.status, response.statusText, errorData);
    console.error('Request URL:', `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    console.error('Request body:', JSON.stringify({
      contents: [{
        parts: [{
          text: params.prompt
        }]
      }]
    }));
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Gemini response received');

  // Handle the new response format from gemini-2.5-flash-image-preview
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidate received from Gemini');
  }

  // Look for inline_data in parts
  const imagePart = candidate.content?.parts?.find((part: any) => part.inline_data);
  if (!imagePart?.inline_data?.data) {
    throw new Error('No image data received from Gemini');
  }

  const imageUrl = `data:image/png;base64,${imagePart.inline_data.data}`;

  return new Response(
    JSON.stringify({
      success: true,
      imageUrl,
      provider: 'gemini'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateWithRunware(params: any, runwareSettings: any) {
  const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
  
  if (!runwareApiKey) {
    throw new Error('Runware API key not configured');
  }

  console.log('Generating with Runware:', { params, runwareSettings });

  const response = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        taskType: "authentication",
        apiKey: runwareApiKey
      },
      {
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: params.prompt,
        model: runwareSettings.model,
        width: params.width || 1024,
        height: params.height || 1024,
        numberResults: 1,
        outputFormat: "WEBP",
        steps: runwareSettings.steps,
        CFGScale: runwareSettings.cfgScale,
        scheduler: runwareSettings.scheduler
      }
    ]),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Runware API error:', response.status, errorData);
    throw new Error(`Runware API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Runware response received');

  const imageResult = data.data?.find((item: any) => item.taskType === 'imageInference');
  
  if (!imageResult?.imageURL) {
    throw new Error('No image URL received from Runware');
  }

  return new Response(
    JSON.stringify({
      success: true,
      imageUrl: imageResult.imageURL,
      provider: 'runware'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}