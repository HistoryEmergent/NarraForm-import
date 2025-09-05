import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Plus, Trash2, Edit, Check, X } from 'lucide-react';

interface EdgeFunctionPrompt {
  id: string;
  user_id: string | null;
  function_name: string;
  name: string;
  prompt_content: string;
  provider: string;
  model: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface EdgeFunctionPromptManagerProps {
  onClose?: () => void;
}

const FUNCTION_NAMES = [
  { value: 'shot-description', label: 'Shot Description' },
  { value: 'summary-generation', label: 'Summary Generation' },
  { value: 'project-prompt', label: 'Project Prompt' },
  { value: 'reports-generation', label: 'Reports Generation' }
];

const PROVIDERS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'xai', label: 'XAI' }
];

const MODEL_OPTIONS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
  openai: ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14', 'gpt-4o-mini'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  xai: ['grok-2-1212', 'grok-2-vision-1212']
};

export function EdgeFunctionPromptManager({ onClose }: EdgeFunctionPromptManagerProps) {
  const [prompts, setPrompts] = useState<EdgeFunctionPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<EdgeFunctionPrompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newPrompt, setNewPrompt] = useState({
    function_name: '',
    name: '',
    prompt_content: '',
    provider: 'gemini',
    model: 'gemini-2.5-flash'
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('edge_function_prompts')
        .select('*')
        .order('function_name', { ascending: true })
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading edge function prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load edge function prompts",
        variant: "destructive"
      });
    }
  };

  const savePrompt = async () => {
    if (!newPrompt.function_name || !newPrompt.name || !newPrompt.prompt_content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('edge_function_prompts')
        .insert({
          user_id: user.id,
          function_name: newPrompt.function_name,
          name: newPrompt.name,
          prompt_content: newPrompt.prompt_content,
          provider: newPrompt.provider,
          model: newPrompt.model,
          is_active: false,
          is_system: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Edge function prompt created successfully"
      });

      setNewPrompt({
        function_name: '',
        name: '',
        prompt_content: '',
        provider: 'gemini',
        model: 'gemini-2.5-flash'
      });
      setIsCreating(false);
      loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error",
        description: "Failed to create edge function prompt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrompt = async () => {
    if (!selectedPrompt) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('edge_function_prompts')
        .update({
          name: selectedPrompt.name,
          prompt_content: selectedPrompt.prompt_content,
          provider: selectedPrompt.provider,
          model: selectedPrompt.model
        })
        .eq('id', selectedPrompt.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Edge function prompt updated successfully"
      });

      setIsEditing(false);
      loadPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update edge function prompt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('edge_function_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Edge function prompt deleted successfully"
      });

      loadPrompts();
      if (selectedPrompt?.id === promptId) {
        setSelectedPrompt(null);
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Error",
        description: "Failed to delete edge function prompt",
        variant: "destructive"
      });
    }
  };

  const setActivePrompt = async (promptId: string, functionName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, deactivate all prompts for this function
      await supabase
        .from('edge_function_prompts')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('function_name', functionName);

      // Then activate the selected prompt
      const { error } = await supabase
        .from('edge_function_prompts')
        .update({ is_active: true })
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Active prompt updated successfully"
      });

      loadPrompts();
    } catch (error) {
      console.error('Error setting active prompt:', error);
      toast({
        title: "Error",
        description: "Failed to set active prompt",
        variant: "destructive"
      });
    }
  };

  const getAvailableModels = (provider: string) => {
    return MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS] || [];
  };

  const copyFromSystem = (systemPrompt: EdgeFunctionPrompt) => {
    setNewPrompt({
      function_name: systemPrompt.function_name,
      name: `Custom ${systemPrompt.name}`,
      prompt_content: systemPrompt.prompt_content,
      provider: systemPrompt.provider,
      model: systemPrompt.model
    });
    setIsCreating(true);
    setSelectedPrompt(null);
  };

  const groupedPrompts = FUNCTION_NAMES.reduce((acc, fn) => {
    acc[fn.value] = prompts.filter(p => p.function_name === fn.value);
    return acc;
  }, {} as Record<string, EdgeFunctionPrompt[]>);

  const getActivePrompt = (functionName: string) => {
    return prompts.find(p => p.function_name === functionName && p.is_active && !p.is_system);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Edge Function Prompts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edge Function Prompt Manager</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[600px] gap-4">
          {/* Left Panel - Prompt List */}
          <div className="w-1/2 border-r pr-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Prompts by Function</h3>
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Prompt
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              {FUNCTION_NAMES.map(fn => {
                const activePrompt = getActivePrompt(fn.value);
                const systemPrompt = groupedPrompts[fn.value]?.find(p => p.is_system);
                const currentlyUsed = activePrompt || systemPrompt;
                
                return (
                  <div key={fn.value} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-muted-foreground">{fn.label}</h4>
                      {currentlyUsed && (
                        <Badge variant="outline" className="text-xs">
                          Using: {currentlyUsed.is_system ? 'System' : 'Custom'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {groupedPrompts[fn.value]?.map(prompt => (
                        <Card 
                          key={prompt.id}
                          className={`cursor-pointer transition-colors ${
                            selectedPrompt?.id === prompt.id ? 'ring-2 ring-primary' : ''
                          } ${
                            prompt.id === currentlyUsed?.id ? 'border-primary' : ''
                          }`}
                          onClick={() => setSelectedPrompt(prompt)}
                        >
                          <CardHeader className="p-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{prompt.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                {prompt.is_active && (
                                  <Badge variant="default" className="text-xs">Active</Badge>
                                )}
                                {prompt.is_system && (
                                  <Badge variant="secondary" className="text-xs">System</Badge>
                                )}
                                {prompt.id === currentlyUsed?.id && (
                                  <Badge variant="outline" className="text-xs">In Use</Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription className="text-xs">
                              {prompt.provider} • {prompt.model}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                      {!groupedPrompts[fn.value]?.length && (
                        <div className="text-xs text-muted-foreground p-3 border rounded-md">
                          No prompts available for this function
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </div>

          {/* Right Panel - Details/Editor */}
          <div className="w-1/2 pl-4">
            {isCreating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Create New Prompt</h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={savePrompt} 
                      size="sm"
                      disabled={loading}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      onClick={() => setIsCreating(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Function</label>
                    <Select value={newPrompt.function_name} onValueChange={(value) => 
                      setNewPrompt(prev => ({ ...prev, function_name: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNCTION_NAMES.map(fn => (
                          <SelectItem key={fn.value} value={fn.value}>{fn.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newPrompt.name}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter prompt name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Provider</label>
                      <Select value={newPrompt.provider} onValueChange={(value) => {
                        const models = getAvailableModels(value);
                        setNewPrompt(prev => ({ 
                          ...prev, 
                          provider: value,
                          model: models[0] || ''
                        }));
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Model</label>
                      <Select value={newPrompt.model} onValueChange={(value) => 
                        setNewPrompt(prev => ({ ...prev, model: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableModels(newPrompt.provider).map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Prompt Content</label>
                    <Textarea
                      value={newPrompt.prompt_content}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_content: e.target.value }))}
                      placeholder="Enter prompt content..."
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
              </div>
            ) : selectedPrompt ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Prompt Details</h3>
                  <div className="flex gap-2">
                    {selectedPrompt.is_system && (
                      <Button 
                        onClick={() => copyFromSystem(selectedPrompt)}
                        size="sm"
                        variant="outline"
                      >
                        Copy as Custom
                      </Button>
                    )}
                    {!selectedPrompt.is_active && !selectedPrompt.is_system && (
                      <Button 
                        onClick={() => setActivePrompt(selectedPrompt.id, selectedPrompt.function_name)}
                        size="sm"
                        variant="outline"
                      >
                        Set as Active
                      </Button>
                    )}
                    {!selectedPrompt.is_system && (
                      <>
                        <Button 
                          onClick={() => setIsEditing(!isEditing)} 
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {isEditing ? 'Cancel' : 'Edit'}
                        </Button>
                        {isEditing && (
                          <Button 
                            onClick={updatePrompt} 
                            size="sm"
                            disabled={loading}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                        )}
                        <Button 
                          onClick={() => deletePrompt(selectedPrompt.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    {isEditing ? (
                      <Input
                        value={selectedPrompt.name}
                        onChange={(e) => setSelectedPrompt(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    ) : (
                      <p className="text-sm mt-1">{selectedPrompt.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Provider</label>
                      {isEditing ? (
                        <Select 
                          value={selectedPrompt.provider} 
                          onValueChange={(value) => {
                            const models = getAvailableModels(value);
                            setSelectedPrompt(prev => prev ? { 
                              ...prev, 
                              provider: value,
                              model: models[0] || prev.model
                            } : null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map(provider => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm mt-1">{selectedPrompt.provider}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Model</label>
                      {isEditing ? (
                        <Select 
                          value={selectedPrompt.model} 
                          onValueChange={(value) => 
                            setSelectedPrompt(prev => prev ? { ...prev, model: value } : null)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableModels(selectedPrompt.provider).map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm mt-1">{selectedPrompt.model}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Prompt Content</label>
                    {isEditing ? (
                      <Textarea
                        value={selectedPrompt.prompt_content}
                        onChange={(e) => setSelectedPrompt(prev => prev ? { ...prev, prompt_content: e.target.value } : null)}
                        className="min-h-[250px] mt-1"
                      />
                    ) : (
                      <ScrollArea className="h-[250px] w-full border rounded-md p-3 mt-1">
                        <pre className="text-xs whitespace-pre-wrap">
                          {selectedPrompt.prompt_content}
                        </pre>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Settings className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Edge Function Prompt Manager</h3>
                <div className="space-y-2 text-sm max-w-md">
                  <p>
                    Customize AI prompts used by edge functions. System prompts are read-only defaults.
                  </p>
                  <p>
                    <strong>To customize:</strong>
                  </p>
                  <ol className="text-left space-y-1 mt-2">
                    <li>1. Select a system prompt</li>
                    <li>2. Click "Copy as Custom"</li>
                    <li>3. Edit and save your version</li>
                    <li>4. Click "Set as Active" to use it</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}