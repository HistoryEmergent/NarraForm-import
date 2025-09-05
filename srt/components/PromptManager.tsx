import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Save, Plus, Trash2, FileText, Film } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'novel-to-script' | 'screenplay-to-script' | 'custom';
  prompt: string;
  is_default?: boolean;
}

interface PromptManagerProps {
  onPromptSelect: (prompt: string) => void;
  onClose?: () => void;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'novel-default',
    name: 'Novel to Audio Drama',
    description: 'Convert novel chapters into audio drama scripts with proper character identification and direction.',
    category: 'novel-to-script',
    prompt: "Convert the entire chapter into an audio drama script. To do this, you will need to identify the character speaking each line, split up the text by narrator and character. Try to identify and tag inflection and direction for parentheticals to provide guidance for how dialogue should be delivered. Use proper Fountain screenplay format with character names in ALL CAPS, parentheticals in (parentheses), and scene headings. When you see details in the text that lend themselves to be sound effects, please leave the text intact in the new script format, but also call it out on a new line after the relevant text block as a sound effect in brackets and all caps, for example: [EXPLOSION, FEET POUND PAVEMENT AS THEY RUN]"
  },
  {
    id: 'screenplay-default',
    name: 'Screenplay to Audio Drama',
    description: 'Convert screenplay scenes into audio drama format with expanded narration.',
    category: 'screenplay-to-script',
    prompt: "Convert the entire scene into an audio drama script. To do this, you will need to expand the scene description a little bit, into present tense novel prose type narration, while staying true to the intent of the action lines. Use proper Fountain screenplay format. When you see details in the text that lend themselves to be sound effects, please leave the text intact in the new script format, but also call it out on a new line after the relevant text block as a sound effect in brackets and all caps, for example: [EXPLOSION, FEET POUND PAVEMENT AS THEY RUN]"
  }
];

export function PromptManager({ onPromptSelect, onClose }: PromptManagerProps) {
  const [open, setOpen] = useState(true); // Always open when rendered
  const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'novel-to-script' | 'screenplay-to-script' | 'custom'>('custom');
  const { toast } = useToast();

  // Load templates from database
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load current active prompt after templates are loaded
  useEffect(() => {
    if (templates.length > 0) {
      loadCurrentActivePrompt();
    }
  }, [templates]);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTemplates(DEFAULT_TEMPLATES);
        return;
      }

      // Load user's custom prompts from database
      const { data: userPrompts, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading prompts:', error);
        setTemplates(DEFAULT_TEMPLATES);
        return;
      }

      // Convert database format to template format
      const dbTemplates: PromptTemplate[] = userPrompts.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.name, // Use name as description if not provided
        category: prompt.category as 'novel-to-script' | 'screenplay-to-script' | 'custom',
        prompt: prompt.content,
        is_default: prompt.is_default || false
      }));

      // Merge defaults with user's custom prompts - check both ID and original_template_id
      const mergedTemplates = DEFAULT_TEMPLATES.map(defaultTemplate => {
        const userVersion = dbTemplates.find(t => 
          t.id === defaultTemplate.id || 
          userPrompts.find(p => p.id === t.id)?.original_template_id === defaultTemplate.id
        );
        return userVersion || defaultTemplate;
      });

      // Add custom templates that don't override defaults and aren't modified defaults
      const customTemplates = dbTemplates.filter(t => 
        !DEFAULT_TEMPLATES.find(def => def.id === t.id) &&
        !userPrompts.find(p => p.id === t.id)?.original_template_id
      );

      setTemplates([...mergedTemplates, ...customTemplates]);

      // Migrate localStorage data if exists
      await migrateLocalStorageData(user.id);
    } catch (error) {
      console.error('Error in loadTemplates:', error);
      setTemplates(DEFAULT_TEMPLATES);
    }
  };

  const loadCurrentActivePrompt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentPromptContent = '';
      let currentPromptName = '';

      if (user) {
        // Try to get current prompt from Supabase first
        const { data: currentPrompt, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', 'current-prompt')
          .single();

        if (!error && currentPrompt) {
          currentPromptContent = currentPrompt.content;
          currentPromptName = currentPrompt.name || 'Current Active Prompt';
        }
      }

      // Fallback to localStorage if Supabase didn't have it
      if (!currentPromptContent) {
        currentPromptContent = localStorage.getItem('current-prompt') || '';
        currentPromptName = localStorage.getItem('current-prompt-name') || '';
      }

      if (currentPromptContent) {
        // Find matching template by prompt content or name
        const matchingTemplate = templates.find(template => 
          template.prompt === currentPromptContent || 
          template.name === currentPromptName
        );

        if (matchingTemplate) {
          setSelectedTemplate(matchingTemplate.id);
          return;
        }
      }

      // Fallback to default if no current prompt found
      setSelectedTemplate('novel-default');
    } catch (error) {
      console.error('Error loading current active prompt:', error);
      setSelectedTemplate('novel-default');
    }
  };

  const migrateLocalStorageData = async (userId: string) => {
    const saved = localStorage.getItem('prompt-templates');
    if (!saved) return;

    try {
      const savedTemplates = JSON.parse(saved);
      if (savedTemplates.length === 0) return;

      // Insert each saved template into database
      for (const template of savedTemplates) {
        const { error } = await supabase
          .from('prompts')
          .upsert({
            id: template.id,
            user_id: userId,
            name: template.name,
            content: template.prompt,
            category: template.category || 'custom'
          }, { onConflict: 'id' });

        if (error) {
          console.error('Error migrating template:', template.name, error);
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('prompt-templates');
      
      toast({
        title: "Templates Migrated",
        description: "Your local templates have been moved to your account."
      });
    } catch (error) {
      console.error('Error migrating localStorage data:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if this is a default template (string ID instead of UUID)
      const isDefaultTemplate = DEFAULT_TEMPLATES.some(t => t.id === editingTemplate.id);
      
      let templateId = editingTemplate.id;
      let originalTemplateId = null;
      
      // If it's a default template, generate a new UUID for database storage
      if (isDefaultTemplate) {
        templateId = crypto.randomUUID();
        originalTemplateId = editingTemplate.id;
      }

      const { error } = await supabase
        .from('prompts')
        .upsert({
          id: templateId,
          user_id: user.id,
          name: editingTemplate.name,
          content: editingTemplate.prompt,
          category: editingTemplate.category,
          original_template_id: originalTemplateId
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error saving template:', error);
        toast({
          title: "Error",
          description: "Failed to save template. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state with new ID if it was a default template
      const updatedTemplate = { ...editingTemplate, id: templateId };
      const updatedTemplates = templates.map(t => 
        t.id === editingTemplate.id ? updatedTemplate : t
      );
      setTemplates(updatedTemplates);
      
      // Update selected template if it was the one being edited
      if (selectedTemplate === editingTemplate.id) {
        setSelectedTemplate(templateId);
      }
      
      setEditingTemplate(null);
      
      toast({
        title: "Template Saved",
        description: `"${editingTemplate.name}" has been updated.`
      });
    } catch (error) {
      console.error('Error in handleSaveTemplate:', error);
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive"
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTemplate: PromptTemplate = {
        id: crypto.randomUUID(),
        name: newTemplateName,
        description: newTemplateDescription,
        category: newTemplateCategory,
        prompt: DEFAULT_TEMPLATES[0].prompt,
      };

      const { error } = await supabase
        .from('prompts')
        .insert({
          id: newTemplate.id,
          user_id: user.id,
          name: newTemplate.name,
          content: newTemplate.prompt,
          category: newTemplate.category
        });

      if (error) {
        console.error('Error creating template:', error);
        toast({
          title: "Error",
          description: "Failed to create template. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setTemplates([...templates, newTemplate]);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateCategory('custom');
      setShowCreateForm(false);
      setSelectedTemplate(newTemplate.id);
      setEditingTemplate(newTemplate);
      
      toast({
        title: "Template Created",
        description: `"${newTemplate.name}" has been created.`
      });
    } catch (error) {
      console.error('Error in handleCreateTemplate:', error);
      toast({
        title: "Error",
        description: "Failed to create template.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (DEFAULT_TEMPLATES.find(t => t.id === templateId)) return; // Can't delete defaults
    
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Show confirmation dialog
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        toast({
          title: "Error",
          description: "Failed to delete template. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      
      if (selectedTemplate === templateId) {
        setSelectedTemplate('novel-default');
      }
      
      toast({
        title: "Template Deleted",
        description: "Template has been removed."
      });
    } catch (error) {
      console.error('Error in handleDeleteTemplate:', error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive"
      });
    }
  };

  const handleUsePrompt = async () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Save current prompt to database for this user
          const { error } = await supabase
            .from('prompts')
            .upsert({
              id: 'current-prompt',
              user_id: user.id,
              name: 'Current Active Prompt',
              content: template.prompt,
              category: 'current'
            }, { onConflict: 'id' });

          if (error) {
            console.error('Error saving current prompt:', error);
          }
        }
        
        // Also keep localStorage as fallback
        localStorage.setItem('current-prompt', template.prompt);
        localStorage.setItem('current-prompt-name', template.name);
        
        onPromptSelect(template.prompt);
        setOpen(false);
        
        toast({
          title: "Prompt Applied",
          description: `Using "${template.name}" template for processing.`
        });
      } catch (error) {
        console.error('Error in handleUsePrompt:', error);
        toast({
          title: "Error",
          description: "Failed to apply prompt.",
          variant: "destructive"
        });
      }
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplate);
  const categoryIcon = (category: string) => {
    switch (category) {
      case 'novel-to-script': return <FileText className="h-4 w-4" />;
      case 'screenplay-to-script': return <Film className="h-4 w-4" />;
      default: return <Edit3 className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && onClose) {
        onClose();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit3 className="h-4 w-4" />
          Manage Prompts
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Prompt Templates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Template</CardTitle>
              <CardDescription>
                Choose a prompt template for AI processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {categoryIcon(template.category)}
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTemplate(currentTemplate || null)}
                  disabled={!currentTemplate}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(selectedTemplate)}
                  disabled={!currentTemplate || !!DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Template Preview */}
          {currentTemplate && !editingTemplate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {categoryIcon(currentTemplate.category)}
                      {currentTemplate.name}
                    </CardTitle>
                    <CardDescription>{currentTemplate.description}</CardDescription>
                  </div>
                  <Button onClick={handleUsePrompt} className="gap-2">
                    <Save className="h-4 w-4" />
                    Use This Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted rounded text-sm font-mono">
                  {currentTemplate.prompt}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create New Template */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      placeholder="My Custom Template"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newTemplateCategory} onValueChange={(value: 'novel-to-script' | 'screenplay-to-script' | 'custom') => setNewTemplateCategory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novel-to-script">Novel to Script</SelectItem>
                        <SelectItem value="screenplay-to-script">Screenplay to Script</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of what this template does"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Edit Template */}
          {editingTemplate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Editing: {editingTemplate.name}</CardTitle>
                  <Button onClick={handleSaveTemplate} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editingTemplate.category} onValueChange={(value: 'novel-to-script' | 'screenplay-to-script' | 'custom') => setEditingTemplate({
                      ...editingTemplate,
                      category: value
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novel-to-script">Novel to Script</SelectItem>
                        <SelectItem value="screenplay-to-script">Screenplay to Script</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      description: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea
                    value={editingTemplate.prompt}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      prompt: e.target.value
                    })}
                    rows={8}
                    className="text-sm font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}