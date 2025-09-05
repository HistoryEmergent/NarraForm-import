import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Edit3, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptTemplate {
  id: string;
  name: string;
  novelPrompt: string;
  screenplayPrompt: string;
}

interface PromptEditorProps {
  contentType: 'novel' | 'screenplay';
  onPromptSelect: (novelPrompt: string, screenplayPrompt: string) => void;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default',
    name: 'Default Audio Drama',
    novelPrompt: "Convert the entire chapter into an audio drama script. To do this, you will need to identify the character speaking each line, split up the text by narrator and character. Try to identify and tag inflection and direction for parentheticals to provide guidance for how dialogue should be delivered. Use proper Fountain screenplay format with character names in ALL CAPS, parentheticals in (parentheses), and scene headings.",
    screenplayPrompt: "Convert the entire scene into an audio drama script. To do this, you will need to expand the scene description a little bit, into present tense novel prose type narration, while staying true to the intent of the action lines. Use proper Fountain screenplay format."
  }
];

export function PromptEditor({ contentType, onPromptSelect }: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const { toast } = useToast();

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('prompt-templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
  }, []);

  // Save templates to localStorage
  const saveTemplates = (newTemplates: PromptTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('prompt-templates', JSON.stringify(newTemplates));
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    );
    saveTemplates(updatedTemplates);
    setEditingTemplate(null);
    
    toast({
      title: "Template Saved",
      description: `"${editingTemplate.name}" has been updated.`
    });
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    const newTemplate: PromptTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName,
      novelPrompt: DEFAULT_TEMPLATES[0].novelPrompt,
      screenplayPrompt: DEFAULT_TEMPLATES[0].screenplayPrompt,
    };
    
    saveTemplates([...templates, newTemplate]);
    setNewTemplateName('');
    setEditingTemplate(newTemplate);
    
    toast({
      title: "Template Created",
      description: `"${newTemplate.name}" has been created.`
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (templateId === 'default') return; // Can't delete default
    
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    
    if (selectedTemplate === templateId) {
      setSelectedTemplate('default');
    }
    
    toast({
      title: "Template Deleted",
      description: "Template has been removed."
    });
  };

  const handleUsePrompt = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      onPromptSelect(template.novelPrompt, template.screenplayPrompt);
      setOpen(false);
      
      toast({
        title: "Prompt Applied",
        description: `Using "${template.name}" template for processing.`
      });
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit3 className="h-4 w-4" />
          Edit Prompts
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompt Templates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
                disabled={selectedTemplate === 'default'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Create New Template */}
          <div className="space-y-2">
            <Label>Create New Template</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Template name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current Template Preview */}
          {currentTemplate && !editingTemplate && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">{currentTemplate.name}</h3>
              
              <div className="space-y-2">
                <Label>Novel Prompt</Label>
                <div className="p-3 bg-muted rounded text-sm">
                  {currentTemplate.novelPrompt}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Screenplay Prompt</Label>
                <div className="p-3 bg-muted rounded text-sm">
                  {currentTemplate.screenplayPrompt}
                </div>
              </div>
            </div>
          )}

          {/* Edit Template */}
          {editingTemplate && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Editing: {editingTemplate.name}</h3>
                <Button onClick={handleSaveTemplate} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
              
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
                <Label>Novel Prompt</Label>
                <Textarea
                  value={editingTemplate.novelPrompt}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    novelPrompt: e.target.value
                  })}
                  rows={6}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Screenplay Prompt</Label>
                <Textarea
                  value={editingTemplate.screenplayPrompt}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    screenplayPrompt: e.target.value
                  })}
                  rows={6}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUsePrompt} disabled={!currentTemplate}>
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}