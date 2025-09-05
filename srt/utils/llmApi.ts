import { getSettings } from "@/components/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { geminiRateLimiter } from "./geminiRateLimiter";

export interface LLMResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'xai';

// Provider-specific processing functions
export async function processWithGemini(
  text: string, 
  contentType: 'novel' | 'screenplay',
  customPrompt?: string
): Promise<LLMResponse> {
  const settings = getSettings();
  
  if (!settings?.geminiApiKey) {
    return {
      success: false,
      error: "Gemini API key not configured. Please check your settings."
    };
  }

  const model = settings.geminiModel;
  const prompt = customPrompt || await getPromptForContentType(contentType);

  // Enhanced retry logic with rate limiting
  let lastError: string = '';
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making request
      if (!geminiRateLimiter.canMakeRequest(model)) {
        const waitTime = geminiRateLimiter.getWaitTime(model);
        console.log(`Rate limit reached for ${model}, waiting ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Rate limit exceeded. ${geminiRateLimiter.getStatusMessage(model)}. Please wait before trying again.`
          };
        }
        
        // Wait for rate limit to clear
        await geminiRateLimiter.waitForRateLimit(model);
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${prompt}\n\nOriginal text:\n${text}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || 'Unknown error';
        
        // Handle rate limit and quota errors specifically
        if (response.status === 429) {
          // Check if this is a daily quota error
          if (errorMessage.includes('quota') || errorMessage.includes('daily')) {
            const status = geminiRateLimiter.getRateLimitStatus(model);
            const alternative = geminiRateLimiter.getAlternativeModel(model);
            let errorMsg = `Daily quota exceeded for ${model} (${status.dailyRequests}/${status.dailyQuota}).`;
            if (alternative) {
              errorMsg += ` Try switching to ${alternative} which has higher quotas.`;
            }
            return {
              success: false,
              error: errorMsg
            };
          }
          
          lastError = `Rate limit exceeded (${response.status}): ${errorMessage}`;
          console.log(`Rate limit error on attempt ${attempt}/${maxRetries}: ${lastError}`);
          
          if (attempt < maxRetries) {
            // Exponential backoff for rate limit errors
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For other errors, return immediately
        return {
          success: false,
          error: `Gemini API Error: ${response.status} - ${errorMessage}`
        };
      }

      const data = await response.json();
      
      // Enhanced response validation
      let responseText = '';
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        responseText = data.candidates[0].content.parts[0].text;
      } else if (data.candidates?.[0]?.content?.parts?.[0]) {
        // Handle cases where parts exist but structure is different
        responseText = JSON.stringify(data.candidates[0].content.parts[0]);
      } else if (data.candidates?.[0]?.text) {
        // Alternative response structure
        responseText = data.candidates[0].text;
      }
      
      // Validate response content
      if (!responseText || responseText.trim().length === 0) {
        lastError = "Empty response from Gemini API";
        console.log(`Empty response on attempt ${attempt}/${maxRetries}`);
        
        if (attempt < maxRetries) {
          // Short delay for empty response retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      } else {
        // Success! Record the successful request
        geminiRateLimiter.recordRequest(model);
        return {
          success: true,
          text: responseText.trim()
        };
      }

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Gemini API Error on attempt ${attempt}/${maxRetries}:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff for network errors
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // If we get here, all retries failed
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
  };
}

export async function processWithOpenAI(
  text: string, 
  contentType: 'novel' | 'screenplay',
  customPrompt?: string
): Promise<LLMResponse> {
  const settings = getSettings();
  
  if (!settings?.openaiApiKey) {
    return {
      success: false,
      error: "OpenAI API key not configured. Please check your settings."
    };
  }

  const prompt = customPrompt || await getPromptForContentType(contentType);
  
  try {
    // Handle different parameter requirements for different OpenAI models
    const isNewerModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(settings.openaiModel);
    
    const requestBody: any = {
      model: settings.openaiModel,
      messages: [
        { role: 'system', content: 'You are an expert script writer and content converter.' },
        { role: 'user', content: `${prompt}\n\nOriginal text:\n${text}` }
      ],
    };

    // Use appropriate token parameter based on model
    if (isNewerModel) {
      requestBody.max_completion_tokens = 8192;
      // Don't include temperature for newer models as it's not supported
    } else {
      requestBody.max_tokens = 8192;
      requestBody.temperature = 0.7;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: `OpenAI API Error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`
      };
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated by OpenAI"
      };
    }

    return {
      success: true,
      text: generatedText
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function processWithClaude(
  text: string, 
  contentType: 'novel' | 'screenplay',
  customPrompt?: string
): Promise<LLMResponse> {
  const settings = getSettings();
  
  if (!settings?.claudeApiKey) {
    return {
      success: false,
      error: "Claude API key not configured. Please check your settings."
    };
  }

  const prompt = customPrompt || await getPromptForContentType(contentType);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': settings.claudeApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: settings.claudeModel,
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `${prompt}\n\nOriginal text:\n${text}`
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: `Claude API Error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`
      };
    }

    const data = await response.json();
    const generatedText = data.content?.[0]?.text;

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated by Claude"
      };
    }

    return {
      success: true,
      text: generatedText
    };

  } catch (error) {
    console.error('Claude API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function processWithXAI(
  text: string, 
  contentType: 'novel' | 'screenplay',
  customPrompt?: string
): Promise<LLMResponse> {
  const settings = getSettings();
  
  if (!settings?.xaiApiKey) {
    return {
      success: false,
      error: "xAI API key not configured. Please check your settings."
    };
  }

  const prompt = customPrompt || await getPromptForContentType(contentType);

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.xaiModel,
        messages: [
          { role: 'system', content: 'You are an expert script writer and content converter.' },
          { role: 'user', content: `${prompt}\n\nOriginal text:\n${text}` }
        ],
        max_tokens: 8192,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: `xAI API Error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`
      };
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated by xAI"
      };
    }

    return {
      success: true,
      text: generatedText
    };

  } catch (error) {
    console.error('xAI API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Universal processing function that routes to the correct provider
export async function processWithLLM(
  text: string, 
  contentType: 'novel' | 'screenplay',
  provider?: LLMProvider,
  customPrompt?: string
): Promise<LLMResponse> {
  const settings = getSettings();
  
  if (!settings) {
    return {
      success: false,
      error: "No settings configured. Please configure at least one API key."
    };
  }

  // Use provided provider or fall back to default
  const selectedProvider = provider || settings.defaultProvider;

  // Check if the selected provider has a configured API key
  const providerKeyMap = {
    gemini: settings.geminiApiKey,
    openai: settings.openaiApiKey,
    claude: settings.claudeApiKey,
    xai: settings.xaiApiKey
  };

  if (!providerKeyMap[selectedProvider]?.trim()) {
    // Try to find an alternative configured provider
    const availableProviders = Object.entries(providerKeyMap)
      .filter(([_, key]) => key?.trim())
      .map(([provider, _]) => provider as LLMProvider);

    if (availableProviders.length === 0) {
      return {
        success: false,
        error: "No API keys configured. Please configure at least one provider in settings."
      };
    }

    // Use the first available provider
    const fallbackProvider = availableProviders[0];
    console.warn(`Selected provider ${selectedProvider} not configured, falling back to ${fallbackProvider}`);
    
    return processWithLLM(text, contentType, fallbackProvider, customPrompt);
  }

  // Route to the appropriate provider function
  switch (selectedProvider) {
    case 'gemini':
      return processWithGemini(text, contentType, customPrompt);
    case 'openai':
      return processWithOpenAI(text, contentType, customPrompt);
    case 'claude':
      return processWithClaude(text, contentType, customPrompt);
    case 'xai':
      return processWithXAI(text, contentType, customPrompt);
    default:
      return {
        success: false,
        error: `Unknown provider: ${selectedProvider}`
      };
  }
}

// Helper function to get prompt for content type
async function getPromptForContentType(contentType: 'novel' | 'screenplay'): Promise<string> {
  let promptContent: string | null = null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Try to get current prompt from database
      const { data: currentPrompt } = await supabase
        .from('prompts')
        .select('content')
        .eq('user_id', user.id)
        .eq('id', 'current-prompt')
        .maybeSingle();
      
      promptContent = currentPrompt?.content || null;
      
      // Fallback to localStorage if no database prompt
      if (!promptContent) {
        promptContent = localStorage.getItem('current-prompt');
      }
    } else {
      // Not authenticated, fallback to localStorage
      promptContent = localStorage.getItem('current-prompt');
    }
  } catch (error) {
    console.error('Error loading current prompt:', error);
    // Fallback to localStorage on error
    promptContent = localStorage.getItem('current-prompt');
  }
  
  // If no saved prompt, use content-type specific defaults
  if (!promptContent) {
    if (contentType === 'novel') {
      return "Convert the entire chapter into an audio drama script. To do this, you will need to identify the character speaking each line, split up the text by narrator and character. Try to identify and tag inflection and direction for parentheticals to provide guidance for how dialogue should be delivered. Use proper Fountain screenplay format with character names in ALL CAPS, parentheticals in (parentheses), and scene headings. When you see details in the text that lend themselves to be sound effects, please leave the text intact in the new script format, but also call it out on a new line after the relevant text block as a sound effect in brackets and all caps, for example: [EXPLOSION, FEET POUND PAVEMENT AS THEY RUN]";
    } else {
      return "Convert the entire scene into an audio drama script. To do this, you will need to expand the scene description a little bit, into present tense novel prose type narration, while staying true to the intent of the action lines. Use proper Fountain screenplay format. When you see details in the text that lend themselves to be sound effects, please leave the text intact in the new script format, but also call it out on a new line after the relevant text block as a sound effect in brackets and all caps, for example: [EXPLOSION, FEET POUND PAVEMENT AS THEY RUN]";
    }
  }
  
  return promptContent;
}

// Backwards compatibility exports
export type GeminiResponse = LLMResponse;