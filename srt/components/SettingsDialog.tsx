import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Sparkles, LogOut, User, Bot, Brain, Zap, CheckCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { EdgeFunctionPromptManager } from "@/components/EdgeFunctionPromptManager";

interface SettingsData {
  // Provider selection
  defaultProvider: 'gemini' | 'openai' | 'claude' | 'xai';
  
  // Gemini settings
  geminiApiKey: string;
  geminiModel: 'gemini-2.5-flash' | 'gemini-2.5-flash-8b' | 'gemini-2.0-flash-exp' | 'gemini-2.5-pro';
  
  // OpenAI settings
  openaiApiKey: string;
  openaiModel: 'gpt-5-2025-08-07' | 'gpt-5-mini-2025-08-07' | 'gpt-5-nano-2025-08-07' | 'gpt-4.1-2025-04-14' | 'o3-2025-04-16' | 'o4-mini-2025-04-16';
  
  // Claude settings
  claudeApiKey: string;
  claudeModel: 'claude-opus-4-20250514' | 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022' | 'claude-3-5-sonnet-20241022';
  
  // xAI settings
  xaiApiKey: string;
  xaiModel: 'grok-4' | 'grok-beta' | 'grok-vision-beta';

  // Image Generation Settings
  imageGeneration: {
    provider: 'openai' | 'gemini' | 'runware';
    openai: {
      model: 'gpt-image-1' | 'dall-e-3' | 'dall-e-2';
      quality: 'standard' | 'hd';
      size: '1024x1024' | '1792x1024' | '1024x1792';
      style: 'vivid' | 'natural';
    };
    gemini: {
      model: 'gemini-2.5-flash-image-preview';
      quality: 'standard' | 'high';
      aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    };
    runware: {
      model: 'runware:100@1';
      steps: number;
      cfgScale: number;
      scheduler: 'FlowMatchEulerDiscreteScheduler' | 'EulerDiscreteScheduler';
    };
  };

  // Edge Function Model Settings
  edgeFunctionModels: {
    summary: {
      provider: 'gemini' | 'openai' | 'claude' | 'xai' | 'default';
      model?: string;
    };
    projectPrompt: {
      provider: 'gemini' | 'openai' | 'claude' | 'xai' | 'default';
      model?: string;
    };
    shotDescription: {
      provider: 'gemini' | 'openai' | 'claude' | 'xai' | 'default';
      model?: string;
    };
    reports: {
      provider: 'gemini' | 'openai' | 'claude' | 'xai' | 'default';
      model?: string;
    };
    imageGeneration: {
      provider: 'gemini' | 'openai' | 'runware' | 'default';
      model?: string;
    };
  };
}

interface SettingsDialogProps {
  user?: { email?: string };
}

export function SettingsDialog({ user }: SettingsDialogProps = {}) {
  const [settings, setSettings] = useState<SettingsData>({
    defaultProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: '',
    openaiModel: 'gpt-5-2025-08-07',
    claudeApiKey: '',
    claudeModel: 'claude-sonnet-4-20250514',
    xaiApiKey: '',
    xaiModel: 'grok-4',
    imageGeneration: {
      provider: 'gemini',
      openai: {
        model: 'gpt-image-1',
        quality: 'standard',
        size: '1024x1024',
        style: 'vivid'
      },
      gemini: {
        model: 'gemini-2.5-flash-image-preview',
        quality: 'standard',
        aspectRatio: '1:1'
      },
      runware: {
        model: 'runware:100@1',
        steps: 4,
        cfgScale: 1,
        scheduler: 'FlowMatchEulerDiscreteScheduler'
      }
    },
    edgeFunctionModels: {
      summary: { provider: 'default' },
      projectPrompt: { provider: 'default' },
      shotDescription: { provider: 'default' },
      reports: { provider: 'default' },
      imageGeneration: { provider: 'default' }
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('audiodrama-settings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      
      // Migrate old settings to include edgeFunctionModels if missing
      const migratedSettings = {
        ...parsedSettings,
        edgeFunctionModels: parsedSettings.edgeFunctionModels || {
          summary: { provider: 'default' },
          projectPrompt: { provider: 'default' },
          shotDescription: { provider: 'default' },
          reports: { provider: 'default' },
          imageGeneration: { provider: 'default' }
        },
        imageGeneration: parsedSettings.imageGeneration || {
          provider: 'gemini',
          openai: {
            model: 'gpt-image-1',
            quality: 'standard',
            size: '1024x1024',
            style: 'vivid'
          },
          gemini: {
            model: 'gemini-2.5-flash-image-preview',
            quality: 'standard',
            aspectRatio: '1:1'
          },
          runware: {
            model: 'runware:100@1',
            steps: 4,
            cfgScale: 1,
            scheduler: 'FlowMatchEulerDiscreteScheduler'
          }
        }
      };
      
      setSettings(migratedSettings);
      
      // Save migrated settings back to localStorage
      if (!parsedSettings.edgeFunctionModels || !parsedSettings.imageGeneration) {
        localStorage.setItem('audiodrama-settings', JSON.stringify(migratedSettings));
      }
    }
  }, []);

  const handleSave = () => {
    const hasAnyApiKey = settings.geminiApiKey.trim() || settings.openaiApiKey.trim() || 
                        settings.claudeApiKey.trim() || settings.xaiApiKey.trim();
    
    if (!hasAnyApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter at least one API key to use AI processing.",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('audiodrama-settings', JSON.stringify(settings));
    setIsOpen(false);
    
    toast({
      title: "Settings Saved",
      description: "Your API configuration has been saved successfully."
    });
  };

  const getProviderStatus = (provider: keyof Pick<SettingsData, 'geminiApiKey' | 'openaiApiKey' | 'claudeApiKey' | 'xaiApiKey'>) => {
    return settings[provider]?.trim() ? 'configured' : 'not-configured';
  };

  const getDefaultModelForProvider = (provider: string) => {
    switch (provider) {
      case 'gemini': return settings.geminiModel;
      case 'openai': return settings.openaiModel;
      case 'claude': return settings.claudeModel;
      case 'xai': return settings.xaiModel;
      default: return '';
    }
  };

  const getModelsForProvider = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return [
          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
          { value: 'gemini-2.5-flash-8b', label: 'Gemini 2.5 Flash 8B' },
          { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
        ];
      case 'openai':
        return [
          { value: 'gpt-5-2025-08-07', label: 'GPT-5' },
          { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini' },
          { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano' },
          { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1' },
          { value: 'o3-2025-04-16', label: 'O3' },
          { value: 'o4-mini-2025-04-16', label: 'O4 Mini' }
        ];
      case 'claude':
        return [
          { value: 'claude-opus-4-20250514', label: 'Claude 4 Opus' },
          { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
        ];
      case 'xai':
        return [
          { value: 'grok-4', label: 'Grok 4' },
          { value: 'grok-beta', label: 'Grok Beta' },
          { value: 'grok-vision-beta', label: 'Grok Vision Beta' }
        ];
      default:
        return [];
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setIsOpen(false);
        navigate('/');
        toast({
          title: "Logged out",
          description: "You have been successfully logged out."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during logout.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your API settings to enable AI processing features.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-0 flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* User Profile Section */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Section - Placeholder for future admin features */}
            {!roleLoading && isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </CardTitle>
                  <CardDescription>
                    Administrative tools and demo project management are available in the Project Manager.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Admin features have been moved to the Project Manager for better organization.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Default Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Default AI Provider
                </CardTitle>
                <CardDescription>
                  Choose which AI provider to use by default for content processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={settings.defaultProvider} 
                  onValueChange={(value: 'gemini' | 'openai' | 'claude' | 'xai') => 
                    setSettings(prev => ({ ...prev, defaultProvider: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                    <SelectItem value="xai">xAI Grok</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Image Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Image Generation
                </CardTitle>
                <CardDescription>
                  Configure AI providers for generating images from shot descriptions and prompts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select 
                    value={settings.imageGeneration.provider} 
                    onValueChange={(value: 'openai' | 'gemini' | 'runware') => 
                      setSettings(prev => ({ ...prev, imageGeneration: { ...prev.imageGeneration, provider: value } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select image provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini 2.5 Flash Image (Nano Banana)</SelectItem>
                      <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                      <SelectItem value="runware">Runware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.imageGeneration.provider === 'openai' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">OpenAI Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Select 
                          value={settings.imageGeneration.openai.model} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                openai: { ...prev.imageGeneration.openai, model: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-image-1">GPT Image 1 (Latest)</SelectItem>
                            <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                            <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quality</Label>
                        <Select 
                          value={settings.imageGeneration.openai.quality} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                openai: { ...prev.imageGeneration.openai, quality: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="hd">HD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select 
                          value={settings.imageGeneration.openai.size} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                openai: { ...prev.imageGeneration.openai, size: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                            <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                            <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Style</Label>
                        <Select 
                          value={settings.imageGeneration.openai.style} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                openai: { ...prev.imageGeneration.openai, style: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vivid">Vivid</SelectItem>
                            <SelectItem value="natural">Natural</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {settings.imageGeneration.provider === 'gemini' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">Gemini Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Select 
                          value={settings.imageGeneration.gemini.model} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                gemini: { ...prev.imageGeneration.gemini, model: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash Image Preview</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quality</Label>
                        <Select 
                          value={settings.imageGeneration.gemini.quality} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                gemini: { ...prev.imageGeneration.gemini, quality: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Aspect Ratio</Label>
                        <Select 
                          value={settings.imageGeneration.gemini.aspectRatio} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                gemini: { ...prev.imageGeneration.gemini, aspectRatio: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1:1">Square (1:1)</SelectItem>
                            <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                            <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                            <SelectItem value="4:3">Standard (4:3)</SelectItem>
                            <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {settings.imageGeneration.provider === 'runware' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">Runware Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Select 
                          value={settings.imageGeneration.runware.model} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                runware: { ...prev.imageGeneration.runware, model: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="runware:100@1">Runware 100@1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Steps</Label>
                        <Select 
                          value={settings.imageGeneration.runware.steps.toString()} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                runware: { ...prev.imageGeneration.runware, steps: parseInt(value) } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 (Fastest)</SelectItem>
                            <SelectItem value="4">4 (Recommended)</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="16">16</SelectItem>
                            <SelectItem value="32">32 (Best Quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CFG Scale</Label>
                        <Select 
                          value={settings.imageGeneration.runware.cfgScale.toString()} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                runware: { ...prev.imageGeneration.runware, cfgScale: parseInt(value) } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 (Low Guidance)</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5 (Recommended)</SelectItem>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="9">9 (High Guidance)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Scheduler</Label>
                        <Select 
                          value={settings.imageGeneration.runware.scheduler} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              imageGeneration: { 
                                ...prev.imageGeneration, 
                                runware: { ...prev.imageGeneration.runware, scheduler: value } 
                              } 
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FlowMatchEulerDiscreteScheduler">Flow Match Euler (Recommended)</SelectItem>
                            <SelectItem value="EulerDiscreteScheduler">Euler Discrete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edge Function Prompts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Edge Function Prompts
                </CardTitle>
                <CardDescription>
                  Customize prompts and models for AI functions like shot descriptions, summaries, and reports.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EdgeFunctionPromptManager />
              </CardContent>
            </Card>

            {/* Edge Function Models - Collapsed Legacy */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Legacy Edge Function Models
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (Use Edge Function Prompts above for better control)
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="space-y-6 pt-6">
                {/* Summary Generation */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Summary Generation</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <Select 
                        value={settings.edgeFunctionModels.summary.provider} 
                        onValueChange={(value: any) => 
                          setSettings(prev => ({ 
                            ...prev, 
                            edgeFunctionModels: { 
                              ...prev.edgeFunctionModels, 
                              summary: { 
                                ...prev.edgeFunctionModels.summary,
                                provider: value,
                                model: value === 'default' ? undefined : prev.edgeFunctionModels.summary.model
                              }
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="xai">xAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.edgeFunctionModels.summary.provider !== 'default' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Select 
                          value={settings.edgeFunctionModels.summary.model || getDefaultModelForProvider(settings.edgeFunctionModels.summary.provider)} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              edgeFunctionModels: { 
                                ...prev.edgeFunctionModels, 
                                summary: { 
                                  ...prev.edgeFunctionModels.summary,
                                  model: value
                                }
                              }
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(settings.edgeFunctionModels.summary.provider).map(model => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Prompt Generation */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Project Prompt Generation</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <Select 
                        value={settings.edgeFunctionModels.projectPrompt.provider} 
                        onValueChange={(value: any) => 
                          setSettings(prev => ({ 
                            ...prev, 
                            edgeFunctionModels: { 
                              ...prev.edgeFunctionModels, 
                              projectPrompt: { 
                                ...prev.edgeFunctionModels.projectPrompt,
                                provider: value,
                                model: value === 'default' ? undefined : prev.edgeFunctionModels.projectPrompt.model
                              }
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="xai">xAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.edgeFunctionModels.projectPrompt.provider !== 'default' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Select 
                          value={settings.edgeFunctionModels.projectPrompt.model || getDefaultModelForProvider(settings.edgeFunctionModels.projectPrompt.provider)} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              edgeFunctionModels: { 
                                ...prev.edgeFunctionModels, 
                                projectPrompt: { 
                                  ...prev.edgeFunctionModels.projectPrompt,
                                  model: value
                                }
                              }
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(settings.edgeFunctionModels.projectPrompt.provider).map(model => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shot Description Generation */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Shot Description Generation</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <Select 
                        value={settings.edgeFunctionModels.shotDescription.provider} 
                        onValueChange={(value: any) => 
                          setSettings(prev => ({ 
                            ...prev, 
                            edgeFunctionModels: { 
                              ...prev.edgeFunctionModels, 
                              shotDescription: { 
                                ...prev.edgeFunctionModels.shotDescription,
                                provider: value,
                                model: value === 'default' ? undefined : prev.edgeFunctionModels.shotDescription.model
                              }
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="xai">xAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.edgeFunctionModels.shotDescription.provider !== 'default' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Select 
                          value={settings.edgeFunctionModels.shotDescription.model || getDefaultModelForProvider(settings.edgeFunctionModels.shotDescription.provider)} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              edgeFunctionModels: { 
                                ...prev.edgeFunctionModels, 
                                shotDescription: { 
                                  ...prev.edgeFunctionModels.shotDescription,
                                  model: value
                                }
                              }
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(settings.edgeFunctionModels.shotDescription.provider).map(model => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reports Generation */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Reports Generation</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <Select 
                        value={settings.edgeFunctionModels.reports.provider} 
                        onValueChange={(value: any) => 
                          setSettings(prev => ({ 
                            ...prev, 
                            edgeFunctionModels: { 
                              ...prev.edgeFunctionModels, 
                              reports: { 
                                ...prev.edgeFunctionModels.reports,
                                provider: value,
                                model: value === 'default' ? undefined : prev.edgeFunctionModels.reports.model
                              }
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="xai">xAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.edgeFunctionModels.reports.provider !== 'default' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Select 
                          value={settings.edgeFunctionModels.reports.model || getDefaultModelForProvider(settings.edgeFunctionModels.reports.provider)} 
                          onValueChange={(value: string) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              edgeFunctionModels: { 
                                ...prev.edgeFunctionModels, 
                                reports: { 
                                  ...prev.edgeFunctionModels.reports,
                                  model: value
                                }
                              }
                            }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(settings.edgeFunctionModels.reports.provider).map(model => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your API keys and models for different AI providers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {/* Google Gemini */}
                  <AccordionItem value="gemini">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4" />
                        <span>Google Gemini</span>
                        {getProviderStatus('geminiApiKey') === 'configured' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="gemini-key">API Key</Label>
                        <Input
                          id="gemini-key"
                          type="password"
                          placeholder="Enter your Gemini API key"
                          value={settings.geminiApiKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{" "}
                          <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Google AI Studio
                          </a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select 
                          value={settings.geminiModel} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, geminiModel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash - Latest and most capable</SelectItem>
                            <SelectItem value="gemini-2.5-flash-8b">Gemini 2.5 Flash 8B - Fast and efficient</SelectItem>
                            <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental) - Latest experimental</SelectItem>
                            <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro - Most advanced model</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* OpenAI */}
                  <AccordionItem value="openai">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Brain className="h-4 w-4" />
                        <span>OpenAI</span>
                        {getProviderStatus('openaiApiKey') === 'configured' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="openai-key">API Key</Label>
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="Enter your OpenAI API key"
                          value={settings.openaiApiKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{" "}
                          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            OpenAI Platform
                          </a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select 
                          value={settings.openaiModel} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, openaiModel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-5-2025-08-07">GPT-5 - Flagship model (Latest)</SelectItem>
                            <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini - Fast and cost-efficient</SelectItem>
                            <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano - Fastest, cheapest</SelectItem>
                            <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 - Reliable results</SelectItem>
                            <SelectItem value="o3-2025-04-16">O3 - Powerful reasoning model</SelectItem>
                            <SelectItem value="o4-mini-2025-04-16">O4 Mini - Fast reasoning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Anthropic Claude */}
                  <AccordionItem value="claude">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4" />
                        <span>Anthropic Claude</span>
                        {getProviderStatus('claudeApiKey') === 'configured' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="claude-key">API Key</Label>
                        <Input
                          id="claude-key"
                          type="password"
                          placeholder="Enter your Claude API key"
                          value={settings.claudeApiKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, claudeApiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{" "}
                          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Anthropic Console
                          </a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select 
                          value={settings.claudeModel} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, claudeModel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="claude-opus-4-20250514">Claude 4 Opus - Most capable and intelligent</SelectItem>
                            <SelectItem value="claude-sonnet-4-20250514">Claude 4 Sonnet - High-performance with exceptional reasoning</SelectItem>
                            <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku - Fastest model for quick responses</SelectItem>
                            <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet - Previous intelligent model</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* xAI Grok */}
                  <AccordionItem value="xai">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4" />
                        <span>xAI Grok</span>
                        {getProviderStatus('xaiApiKey') === 'configured' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="xai-key">API Key</Label>
                        <Input
                          id="xai-key"
                          type="password"
                          placeholder="Enter your xAI API key"
                          value={settings.xaiApiKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, xaiApiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{" "}
                          <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            xAI Console
                          </a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select 
                          value={settings.xaiModel} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, xaiModel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grok-4">Grok 4 - Latest and most advanced</SelectItem>
                            <SelectItem value="grok-beta">Grok Beta - Beta version with latest features</SelectItem>
                            <SelectItem value="grok-vision-beta">Grok Vision Beta - Vision-enabled model</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getSettings(): SettingsData | null {
  const savedSettings = localStorage.getItem('audiodrama-settings');
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    
    // Migrate old settings to include edgeFunctionModels if missing
    const migratedSettings = {
      ...parsedSettings,
      edgeFunctionModels: parsedSettings.edgeFunctionModels || {
        summary: { provider: 'default' },
        projectPrompt: { provider: 'default' },
        shotDescription: { provider: 'default' },
        reports: { provider: 'default' },
        imageGeneration: { provider: 'default' }
      },
      imageGeneration: parsedSettings.imageGeneration || {
        provider: 'gemini',
        openai: {
          model: 'gpt-image-1',
          quality: 'standard',
          size: '1024x1024',
          style: 'vivid'
        },
        gemini: {
          model: 'gemini-2.5-flash-image-preview',
          quality: 'standard',
          aspectRatio: '1:1'
        },
        runware: {
          model: 'runware:100@1',
          steps: 4,
          cfgScale: 1,
          scheduler: 'FlowMatchEulerDiscreteScheduler'
        }
      }
    };
    
    // Save migrated settings back to localStorage if needed
    if (!parsedSettings.edgeFunctionModels || !parsedSettings.imageGeneration) {
      localStorage.setItem('audiodrama-settings', JSON.stringify(migratedSettings));
    }
    
    return migratedSettings;
  }
  return null;
}