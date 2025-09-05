import { getSettings } from "@/components/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface ImageGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
  aspectRatio?: string;
  size?: string; // For OpenAI format like "1024x1024"
}

export type ImageProvider = 'openai' | 'gemini' | 'runware';

export async function generateImage(
  params: ImageGenerationParams,
  provider?: ImageProvider
): Promise<ImageGenerationResponse> {
  const settings = getSettings();
  
  if (!settings) {
    return {
      success: false,
      error: "Settings not configured"
    };
  }

  const selectedProvider = provider || settings.imageGeneration.provider;

  // Convert dimensions to provider-specific format
  const providerParams = { ...params };
  
  if (selectedProvider === 'gemini') {
    // Convert width/height to aspectRatio for Gemini
    if (params.width && params.height) {
      const ratio = params.width / params.height;
      if (ratio === 1) providerParams.aspectRatio = '1:1';
      else if (ratio > 1.5) providerParams.aspectRatio = '16:9';
      else if (ratio < 0.7) providerParams.aspectRatio = '9:16';
      else if (ratio > 1) providerParams.aspectRatio = '4:3';
      else providerParams.aspectRatio = '3:4';
    } else {
      providerParams.aspectRatio = params.aspectRatio || '1:1';
    }
    // Remove width/height for Gemini
    delete providerParams.width;
    delete providerParams.height;
  } else if (selectedProvider === 'openai') {
    // Convert to size format for OpenAI
    if (params.width && params.height) {
      providerParams.size = `${params.width}x${params.height}`;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        provider: selectedProvider,
        params: providerParams,
        settings: settings.imageGeneration
      }
    });

    if (error) {
      console.error('Image generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate image'
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Image generation failed'
      };
    }

    return {
      success: true,
      imageUrl: data.imageUrl
    };
  } catch (error) {
    console.error('Image generation service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Provider-specific generation functions
export async function generateWithOpenAI(params: ImageGenerationParams): Promise<ImageGenerationResponse> {
  return generateImage(params, 'openai');
}

export async function generateWithGemini(params: ImageGenerationParams): Promise<ImageGenerationResponse> {
  return generateImage(params, 'gemini');
}

export async function generateWithRunware(params: ImageGenerationParams): Promise<ImageGenerationResponse> {
  return generateImage(params, 'runware');
}

// Utility to get supported features by provider
export function getProviderFeatures(provider: ImageProvider) {
  switch (provider) {
    case 'openai':
      return {
        supportsSizes: ['1024x1024', '1792x1024', '1024x1792'],
        supportsQuality: ['standard', 'hd'],
        supportsStyle: ['vivid', 'natural'],
        maxPromptLength: 4000
      };
    case 'gemini':
      return {
        supportsAspectRatio: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        supportsQuality: ['standard', 'high'],
        maxPromptLength: 32000
      };
    case 'runware':
      return {
        supportsSizes: ['512x512', '1024x1024', '1536x1536'],
        supportsSteps: [1, 4, 8, 16, 32],
        supportsCfgScale: [1, 3, 5, 7, 9],
        maxPromptLength: 1000
      };
    default:
      return {};
  }
}