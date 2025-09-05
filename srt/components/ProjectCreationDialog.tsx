// ProjectCreationDialog Component - Dedicated dialog for creating new projects
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Upload, FileText, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseFile } from "@/utils/fileParser";

interface ProjectCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectId: string, fileImportData?: {parsedContent: any, initialMedium?: 'novel' | 'screenplay', outputMedium?: string, originalLanguage?: string, outputLanguage?: string, fileName: string, purpose: string}) => void;
  user?: any;
}

export function ProjectCreationDialog({ open, onOpenChange, onProjectCreated, user }: ProjectCreationDialogProps) {
  const [creationStep, setCreationStep] = useState<'purpose' | 'details' | 'file' | 'summary' | 'prompt' | 'confirm'>('purpose');
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState<'novel' | 'screenplay' | 'series'>('novel');
  const [projectPurpose, setProjectPurpose] = useState<'transform_medium' | 'translate_language'>('transform_medium');
  const [originalLanguage, setOriginalLanguage] = useState('english');
  const [outputLanguage, setOutputLanguage] = useState('spanish');
  const [outputMedium, setOutputMedium] = useState('audio_drama');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wantFileImport, setWantFileImport] = useState(false);
  
  // AI-generated content states
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [fileContent, setFileContent] = useState('');
  
  const { toast } = useToast();

  const getDefaultModelForProvider = (provider: string) => {
    // These should match the current default models in settings
    switch (provider) {
      case 'gemini': return 'gemini-2.5-flash';
      case 'openai': return 'gpt-5-2025-08-07';
      case 'claude': return 'claude-sonnet-4-20250514';
      case 'xai': return 'grok-4';
      default: return 'gemini-2.5-flash';
    }
  };

  const resetForm = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectType('novel');
    setProjectPurpose('transform_medium');
    setOriginalLanguage('english');
    setOutputLanguage('spanish');
    setOutputMedium('audio_drama');
    setSelectedFile(null);
    setWantFileImport(false);
    setGeneratedSummary('');
    setGeneratedPrompt('');
    setFileContent('');
    setCreationStep('purpose');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const nextStep = async () => {
    switch (creationStep) {
      case 'purpose':
        setCreationStep('details');
        break;
      case 'details':
        setCreationStep('file');
        break;
      case 'file':
        // Only go to summary if we have file content, otherwise skip to prompt
        if (selectedFile && fileContent) {
          setCreationStep('summary');
        } else if (selectedFile) {
          // Parse file first
          try {
            const parsedContent = await parseFile(selectedFile, newProjectType === 'series' ? 'novel' : newProjectType);
            setFileContent(parsedContent.text);
            setCreationStep('summary');
          } catch (error) {
            console.error('Error parsing file:', error);
            setCreationStep('prompt'); // Skip to prompt if parsing fails
          }
        } else {
          setCreationStep('prompt');
        }
        break;
      case 'summary':
        setCreationStep('prompt');
        break;
      case 'prompt':
        setCreationStep('confirm');
        break;
    }
  };

  const prevStep = () => {
    switch (creationStep) {
      case 'details':
        setCreationStep('purpose');
        break;
      case 'file':
        setCreationStep('details');
        break;
      case 'summary':
        setCreationStep('file');
        break;
      case 'prompt':
        setCreationStep(selectedFile && fileContent ? 'summary' : 'file');
        break;
      case 'confirm':
        setCreationStep('prompt');
        break;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['.txt', '.rtf', '.docx', '.fdx', '.epub'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!allowedTypes.includes(fileExtension)) {
        toast({
          title: "Unsupported file type",
          description: "Please select a .txt, .rtf, .docx, .fdx, or .epub file",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      // Clear previous file content when new file is selected
      setFileContent('');
      setGeneratedSummary('');
      setGeneratedPrompt('');
    }
  };

  // AI generation functions
  const generateSummary = async () => {
    if (!fileContent) {
      toast({
        title: "No content to summarize",
        description: "Please upload a file first to generate a summary.",
        variant: "destructive"
      });
      return;
    }
    
    setAiGenerating(true);
    try {
      // Get user settings for edge function models
      const savedSettings = localStorage.getItem('audiodrama-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : null;
      const summaryProvider = settings?.edgeFunctionModels?.summary?.provider || 'default';
      const provider = summaryProvider === 'default' ? settings?.defaultProvider || 'gemini' : summaryProvider;
      const model = summaryProvider === 'default' ? 
        getDefaultModelForProvider(settings?.defaultProvider || 'gemini') : 
        settings?.edgeFunctionModels?.summary?.model || getDefaultModelForProvider(summaryProvider);

      console.log('Calling generate-summary with provider:', provider);
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { 
          content: fileContent.substring(0, 10000), // First 10k chars for summary
          projectType: newProjectType,
          projectName: newProjectName,
          provider,
          model,
          settings
        }
      });
      
      console.log('Generate-summary response:', { data, error });
      
      if (error) {
        console.error('Generate-summary error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data received from generate-summary function');
      }
      
      if (!data.summary) {
        console.error('Summary not found in response data:', data);
        throw new Error('No summary generated');
      }
      
      setGeneratedSummary(data.summary);
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Summary generation failed",
        description: error.message || "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const generatePrompt = async () => {
    setAiGenerating(true);
    try {
      // Get the appropriate prompt template
      const { data: templates, error: templateError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('category', projectPurpose)
        .eq('input_type', newProjectType)
        .eq('output_type', projectPurpose === 'transform_medium' ? outputMedium : newProjectType)
        .eq('is_system', true)
        .limit(1);
      
      if (templateError) throw templateError;
      
      const template = templates?.[0];
      if (!template) {
        throw new Error('No template found for this project configuration');
      }
      
      // Get user settings for edge function models
      const savedSettings = localStorage.getItem('audiodrama-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : null;
      const promptProvider = settings?.edgeFunctionModels?.projectPrompt?.provider || 'default';
      const provider = promptProvider === 'default' ? settings?.defaultProvider || 'gemini' : promptProvider;
      const model = promptProvider === 'default' ? 
        getDefaultModelForProvider(settings?.defaultProvider || 'gemini') : 
        settings?.edgeFunctionModels?.projectPrompt?.model || getDefaultModelForProvider(promptProvider);

      console.log('Calling generate-project-prompt with provider:', provider);
      const { data, error } = await supabase.functions.invoke('generate-project-prompt', {
        body: { 
          template: template.template_content,
          summary: generatedSummary || 'No summary provided',
          projectPurpose,
          inputType: newProjectType,
          outputType: projectPurpose === 'transform_medium' ? outputMedium : newProjectType,
          originalLanguage: projectPurpose === 'translate_language' ? originalLanguage : null,
          outputLanguage: projectPurpose === 'translate_language' ? outputLanguage : null,
          provider,
          model,
          settings
        }
      });
      
      console.log('Generate-project-prompt response:', { data, error });
      
      if (error) {
        console.error('Generate-project-prompt error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data received from generate-project-prompt function');
      }
      
      if (!data.prompt) {
        console.error('Prompt not found in response data:', data);
        throw new Error('No prompt generated');
      }
      
      setGeneratedPrompt(data.prompt);
    } catch (error: any) {
      console.error('Error generating prompt:', error);
      toast({
        title: "Prompt generation failed",
        description: error.message || "Failed to generate project prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !newProjectType || !user) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: newProjectName.trim(),
          description: newProjectDescription.trim(),
          content_type: newProjectType,
          purpose: projectPurpose,
          original_language: projectPurpose === 'translate_language' ? originalLanguage : null,
          output_language: projectPurpose === 'translate_language' ? outputLanguage : null,
          output_medium: projectPurpose === 'transform_medium' ? outputMedium : null,
          generated_summary: generatedSummary || null,
          generated_prompt: generatedPrompt || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Save generated prompt to user's prompt manager if one was created
      if (generatedPrompt) {
        try {
          const promptName = `${newProjectName} - ${projectPurpose === 'transform_medium' 
            ? `${newProjectType} to ${outputMedium}` 
            : `${originalLanguage} to ${outputLanguage}`} Prompt`;
          
          await supabase
            .from('prompts')
            .insert({
              user_id: user.id,
              name: promptName,
              content: generatedPrompt,
              category: 'project_specific'
            });
        } catch (promptError) {
          console.error('Error saving prompt:', promptError);
          // Don't fail project creation if prompt save fails
        }
      }
      
      // Handle file import if needed
      if (selectedFile && fileContent) {
        try {
          const parsedContent = await parseFile(selectedFile, newProjectType === 'series' ? 'novel' : newProjectType);
          
          toast({
            title: "Project Created with Content",
            description: `"${data.title}" created successfully. Importing file content...`
          });

          onProjectCreated(data.id, {
            parsedContent,
            initialMedium: newProjectType === 'series' ? 'novel' : newProjectType,
            outputMedium: projectPurpose === 'transform_medium' ? outputMedium : undefined,
            originalLanguage: projectPurpose === 'translate_language' ? originalLanguage : undefined,
            outputLanguage: projectPurpose === 'translate_language' ? outputLanguage : undefined,
            fileName: selectedFile.name,
            purpose: projectPurpose
          });
        } catch (parseError: any) {
          console.error('Error parsing file:', parseError);
          toast({
            title: "File import failed",
            description: parseError.message || "Failed to parse the selected file",
            variant: "destructive"
          });
          onProjectCreated(data.id);
        }
      } else {
        toast({
          title: "Project Created",
          description: `"${data.title}" has been created successfully.`
        });
        onProjectCreated(data.id);
      }
      
      handleClose();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (creationStep) {
      case 'purpose': return 'What\'s your purpose?';
      case 'details': return 'Project details';
      case 'file': return 'Import content';
      case 'summary': return 'Story summary';
      case 'prompt': return 'Project prompt';
      case 'confirm': return 'Confirm and create';
      default: return 'Create project';
    }
  };

  const renderPurposeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">What do you want to do with your content?</h3>
        <p className="text-muted-foreground">Choose the main purpose for your project</p>
      </div>
      
      <div className="space-y-4">
        <Card 
          className={`cursor-pointer transition-all ${projectPurpose === 'transform_medium' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setProjectPurpose('transform_medium')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                {projectPurpose === 'transform_medium' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Transform Medium</h4>
                <p className="text-sm text-muted-foreground">Convert between different content formats (novel ↔ screenplay ↔ audio drama)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${projectPurpose === 'translate_language' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setProjectPurpose('translate_language')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                {projectPurpose === 'translate_language' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Translate Language</h4>
                <p className="text-sm text-muted-foreground">Translate content between different languages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input
            placeholder="My Novel"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
        </div>
        {projectPurpose === 'translate_language' && (
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={newProjectType} onValueChange={(value: 'novel' | 'screenplay' | 'series') => setNewProjectType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novel">Novel</SelectItem>
                <SelectItem value="screenplay">Screenplay</SelectItem>
                <SelectItem value="series">TV Series</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {projectPurpose === 'transform_medium' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Original Medium</Label>
            <Select value={newProjectType} onValueChange={(value: 'novel' | 'screenplay' | 'series') => setNewProjectType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novel">Novel</SelectItem>
                <SelectItem value="screenplay">Screenplay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output Medium</Label>
            <Select value={outputMedium} onValueChange={setOutputMedium}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio_drama">Audio Drama</SelectItem>
                <SelectItem value="novel">Novel</SelectItem>
                <SelectItem value="screenplay">Screenplay</SelectItem>
                <SelectItem value="podcast_script">Podcast Script</SelectItem>
                <SelectItem value="radio_drama">Radio Drama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Original Language</Label>
            <Select value={originalLanguage} onValueChange={setOriginalLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="portuguese">Portuguese</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="korean">Korean</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output Language</Label>
            <Select value={outputLanguage} onValueChange={setOutputLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="portuguese">Portuguese</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="korean">Korean</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Input
          placeholder="A brief description of your project"
          value={newProjectDescription}
          onChange={(e) => setNewProjectDescription(e.target.value)}
        />
      </div>
    </div>
  );

  const renderFileStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Import existing content</h3>
        <p className="text-muted-foreground">Optionally import a file to start with existing content</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            id="wantFileImport"
            checked={wantFileImport}
            onChange={(e) => setWantFileImport(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="wantFileImport">I want to import an existing file</Label>
        </div>

        {wantFileImport && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 text-muted-foreground mb-4">
                <Upload className="w-full h-full" />
              </div>
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:text-primary/80">
                  Click to upload file
                </Label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt,.rtf,.docx,.fdx,.epub"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Supports: TXT, RTF, DOCX, FDX, EPUB (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Story Summary</h3>
        <p className="text-muted-foreground">AI will generate a summary of your content, which you can edit</p>
      </div>

      <div className="space-y-4">
        {!generatedSummary && (
          <div className="text-center">
            <Button 
              onClick={generateSummary}
              disabled={aiGenerating || !fileContent}
              className="min-w-[200px]"
            >
              {aiGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
            {!fileContent && (
              <p className="text-sm text-muted-foreground mt-2">
                No content available. Summary generation will be skipped.
              </p>
            )}
          </div>
        )}

        {generatedSummary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary">Summary (Editable)</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateSummary}
                disabled={aiGenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${aiGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <Textarea
              id="summary"
              value={generatedSummary}
              onChange={(e) => setGeneratedSummary(e.target.value)}
              placeholder="Your story summary will appear here..."
              className="min-h-[120px]"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderPromptStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Project Prompt</h3>
        <p className="text-muted-foreground">AI will create a customized prompt for your project transformation</p>
      </div>

      <div className="space-y-4">
        {!generatedPrompt && (
          <div className="text-center">
            <Button 
              onClick={generatePrompt}
              disabled={aiGenerating}
              className="min-w-[200px]"
            >
              {aiGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Project Prompt
                </>
              )}
            </Button>
          </div>
        )}

        {generatedPrompt && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">Project Prompt (Editable)</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generatePrompt}
                disabled={aiGenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${aiGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <Textarea
              id="prompt"
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              placeholder="Your customized project prompt will appear here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              This prompt will be saved to your prompt manager and used for processing your project content.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Ready to create your project?</h3>
        <p className="text-muted-foreground">Review your settings and click create</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div>
            <Label className="text-sm font-medium">Project Name</Label>
            <p className="text-sm">{newProjectName || 'Untitled Project'}</p>
          </div>
          {projectPurpose === 'translate_language' && (
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <p className="text-sm capitalize">{newProjectType}</p>
            </div>
          )}
          {projectPurpose === 'transform_medium' && (
            <div>
              <Label className="text-sm font-medium">Original Medium</Label>
              <p className="text-sm capitalize">{newProjectType}</p>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Purpose</Label>
            <p className="text-sm">
              {projectPurpose === 'transform_medium' ? 'Transform Medium' : 'Translate Language'}
            </p>
          </div>
          {projectPurpose === 'transform_medium' && (
            <div>
              <Label className="text-sm font-medium">Output Medium</Label>
              <p className="text-sm capitalize">{outputMedium.replace('_', ' ')}</p>
            </div>
          )}
          {projectPurpose === 'translate_language' && (
            <div>
              <Label className="text-sm font-medium">Translation</Label>
              <p className="text-sm capitalize">{originalLanguage} → {outputLanguage}</p>
            </div>
          )}
          {generatedSummary && (
            <div>
              <Label className="text-sm font-medium">Generated Summary</Label>
              <p className="text-sm">{generatedSummary.substring(0, 100)}...</p>
            </div>
          )}
          {generatedPrompt && (
            <div>
              <Label className="text-sm font-medium">Custom Prompt</Label>
              <p className="text-sm">Generated and ready for use</p>
            </div>
          )}
          {selectedFile && (
            <div>
              <Label className="text-sm font-medium">File to Import</Label>
              <p className="text-sm">{selectedFile.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (creationStep) {
      case 'purpose': return renderPurposeStep();
      case 'details': return renderDetailsStep();
      case 'file': return renderFileStep();
      case 'summary': return renderSummaryStep();
      case 'prompt': return renderPromptStep();
      case 'confirm': return renderConfirmStep();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Create New Project</span>
            <span className="text-sm text-muted-foreground">
              ({creationStep === 'purpose' ? '1' : 
                creationStep === 'details' ? '2' : 
                creationStep === 'file' ? '3' : 
                creationStep === 'summary' ? '4' :
                creationStep === 'prompt' ? '5' : '6'}/6)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
          </div>

          {renderStepContent()}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={creationStep === 'purpose' ? handleClose : prevStep}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {creationStep === 'purpose' ? 'Cancel' : 'Previous'}
            </Button>

            <Button
              onClick={creationStep === 'confirm' ? createProject : nextStep}
              disabled={loading || (creationStep === 'details' && !newProjectName.trim()) || aiGenerating}
            >
              {creationStep === 'confirm' ? (
                loading ? 'Creating...' : 'Create Project'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}