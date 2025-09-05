import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, SplitSquareHorizontal, Wand2, Save, RefreshCw, FileText, BarChart3, Edit3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { processWithLLM } from "@/utils/llmApi";
import { CollaboratorManager } from "./CollaboratorManager";
import { VersionManager } from "./VersionManager";
import { PromptManager } from "./PromptManager";
import { supabase } from "@/integrations/supabase/client";

import { ChapterMetadata, Chapter, Reports } from "@/types/chapter";
import { QuotaReset } from "./QuotaReset";
import { useUserRole } from "@/hooks/useUserRole";
import { ViewType, getLayoutMode, sortViews } from "@/types/viewMode";
import { ViewSelector } from "./ViewSelector";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { OriginalView } from "./views/OriginalView";
import { ScriptView } from "./views/ScriptView";
import { ShotListView } from "./views/ShotListView";
import { ShotType, TextSelection } from "@/types/shot";

interface EditorViewProps {
  chapter: Chapter;
  selectedViews: ViewType[];
  onViewToggle: (view: ViewType) => void;
  onTextUpdate: (chapter: Chapter) => void;
  projectId?: string;
  isProjectOwner?: boolean;
  isLoadingContent?: boolean;
  storyboardMode?: boolean;
  onStoryboardToggle?: (enabled: boolean) => void;
}

interface ShotData {
  highlights: Array<{
    startPosition: number;
    endPosition: number;
    shotType: ShotType;
    id: string;
    sourceType: 'original' | 'processed';
  }>;
  showHighlights: boolean;
  onCreateShot: (selection: TextSelection, shotType: ShotType) => void;
  onShotClick: (shotId: string) => void;
}

export function EditorView({
  chapter,
  selectedViews,
  onViewToggle,
  onTextUpdate,
  projectId,
  isProjectOwner = false,
  isLoadingContent = false,
  storyboardMode = false,
  onStoryboardToggle
}: EditorViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);
  const [editableText, setEditableText] = useState('');
  const [editableOriginalText, setEditableOriginalText] = useState('');
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [showPromptManager, setShowPromptManager] = useState(false);
  // Shot list integration state
  const [shotData, setShotData] = useState<ShotData | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  // Initialize editable text from chapter data
  useEffect(() => {
    console.log('EditorView: Initializing with chapter data:', chapter.title);
    setEditableText(chapter.processedText || '');
    setEditableOriginalText(chapter.originalText || '');
  }, [chapter]);

  // Load current prompt
  useEffect(() => {
    const savedPrompt = localStorage.getItem('current-prompt');
    const savedPromptName = localStorage.getItem('current-prompt-name');
    if (savedPromptName) {
      setCurrentPrompt(savedPromptName);
    } else {
      setCurrentPrompt(chapter.contentType === 'novel' ? 'Default Novel Prompt' : 'Default Screenplay Prompt');
    }
  }, [chapter.contentType]);

  const handlePromptSelect = (prompt: string) => {
    // Extract prompt name from the selected prompt template
    // This assumes the prompt manager passes the selected template name
    const templates = JSON.parse(localStorage.getItem('prompt-templates') || '[]');
    const defaultTemplates = [
      { id: 'default-novel', name: 'Default Novel Prompt' },
      { id: 'default-screenplay', name: 'Default Screenplay Prompt' }
    ];
    
    const allTemplates = [...defaultTemplates, ...templates];
    const selectedTemplate = allTemplates.find(t => 
      t.novelPrompt === prompt || t.screenplayPrompt === prompt || t.prompt === prompt
    );
    
    if (selectedTemplate) {
      setCurrentPrompt(selectedTemplate.name);
      localStorage.setItem('current-prompt-name', selectedTemplate.name);
    }
    
    setShowPromptManager(false);
  };
  const handleProcessWithAI = async () => {
    // Prevent duplicate requests
    if (isProcessing) {
      console.log('Already processing, ignoring duplicate request');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await processWithLLM(chapter.originalText, chapter.contentType);
      if (!result.success) {
        toast({
          title: "Processing failed",
          description: result.error || "There was an error processing your text. Please check your settings and try again.",
          variant: "destructive"
        });
        return;
      }
      const updatedChapter = {
        ...chapter,
        processedText: result.text
      };
      setEditableText(result.text || '');
      onTextUpdate(updatedChapter);
      
      // Update database with processed text
      await updateProcessedText(chapter.id, result.text);
      
      toast({
        title: "Processing complete",
        description: `${chapter.title} has been converted to audiodrama format.`
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "There was an error processing your text. Please check your settings and try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleSave = async () => {
    const updatedChapter = {
      ...chapter,
      originalText: editableOriginalText,
      processedText: editableText
    };
    onTextUpdate(updatedChapter);
    
    // Create a version when saving changes (using the content being edited)
    const contentToSave = isEditingOriginal ? editableOriginalText : editableText;
    await createVersion(contentToSave);
    
    // Update the database with the changes
    if (isEditingOriginal) {
      await updateOriginalText(editableOriginalText);
    } else if (isEditingScript) {
      await updateProcessedText(chapter.id, editableText);
    }
    
    toast({
      title: "Changes saved",
      description: `Your ${isEditingOriginal ? 'original text' : isEditingScript ? 'script' : 'content'} edits have been saved successfully.`
    });
  };

  const createVersion = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the current highest version number for this chapter
      const { data: existingVersions, error: versionError } = await supabase
        .from('script_versions')
        .select('version_number')
        .eq('episode_id', chapter.id)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) {
        console.error('Error checking versions:', versionError);
        return;
      }

      const maxVersion = existingVersions && existingVersions.length > 0 
        ? existingVersions[0].version_number 
        : 0;
      
      // Update previous versions to not be current
      await supabase
        .from('script_versions')
        .update({ is_current: false })
        .eq('episode_id', chapter.id);

      // Insert the new version
      const { error } = await supabase
        .from('script_versions')
        .insert({
          episode_id: chapter.id,
          version_number: maxVersion + 1,
          content: content,
          created_by: user.id,
          is_current: true
        });

      if (error) {
        console.error('Error creating version:', error);
      }
    } catch (error) {
      console.error('Error in createVersion:', error);
    }
  };

  const updateProcessedText = async (chapterId: string, processedText: string) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ 
          processed_text: processedText,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (error) {
        console.error('Error updating processed text:', error);
        toast({
          title: "Save warning",
          description: "Processed text may not have been saved to database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating processed text:', error);
    }
  };

  const updateOriginalText = async (newOriginalText: string) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ original_text: newOriginalText })
        .eq('id', chapter.id);

      if (error) {
        console.error('Error updating original text:', error);
        toast({
          title: "Save failed",
          description: "Failed to save original text changes.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in updateOriginalText:', error);
    }
  };
  const handleVersionRestore = (content: string) => {
    setEditableText(content);
    const updatedChapter = {
      ...chapter,
      processedText: content
    };
    onTextUpdate(updatedChapter);
  };
  const handleGenerateReports = async () => {
    if (!chapter.processedText) {
      toast({
        title: "No script available",
        description: "Please process the chapter to generate a script first.",
        variant: "destructive"
      });
      return;
    }
    setIsGeneratingReports(true);
    try {
      const getDefaultModelForProvider = (provider: string) => {
        switch (provider) {
          case 'gemini': return 'gemini-2.5-flash';
          case 'openai': return 'gpt-5-2025-08-07';
          case 'claude': return 'claude-sonnet-4-20250514';
          case 'xai': return 'grok-4';
          default: return 'gemini-2.5-flash';
        }
      };

      // Get user settings for edge function models
      const savedSettings = localStorage.getItem('audiodrama-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : null;
      const reportsProvider = settings?.edgeFunctionModels?.reports?.provider || 'default';
      const provider = reportsProvider === 'default' ? settings?.defaultProvider || 'gemini' : reportsProvider;
      const model = reportsProvider === 'default' ? 
        getDefaultModelForProvider(settings?.defaultProvider || 'gemini') : 
        settings?.edgeFunctionModels?.reports?.model || getDefaultModelForProvider(reportsProvider);

      console.log('Calling generate-reports with provider:', provider);
      const { data, error } = await supabase.functions.invoke('generate-reports', {
        body: {
          script: chapter.processedText,
          title: chapter.title,
          provider,
          model,
          settings
        }
      });

      console.log('Generate-reports response:', { data, error });

      if (error) {
        console.error('Generate-reports error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from generate-reports function');
      }

      if (!data.soundEffects && !data.characters) {
        console.error('No reports data found in response:', data);
        throw new Error('No reports generated');
      }
      
      const updatedChapter = {
        ...chapter,
        reports: {
          soundEffects: data.soundEffects || [],
          characters: data.characters || []
        }
      };
      onTextUpdate(updatedChapter);
      toast({
        title: "Reports generated",
        description: "Sound effects and character lists have been created."
      });
    } catch (error) {
      toast({
        title: "Report generation failed",
        description: "There was an error generating the reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReports(false);
    }
  };

  // Helper function to determine if text selection should be enabled
  const shouldEnableShotSelection = () => {
    const hasTextView = selectedViews.includes('original') || selectedViews.includes('script');
    const hasShotList = selectedViews.includes('shot-list');
    return hasTextView && hasShotList;
  };

  // Helper function to render view content
  const renderView = (viewType: ViewType, chapter: Chapter) => {
    const enableShotSelection = shouldEnableShotSelection();
    
    switch (viewType) {
      case 'original':
        return (
          <OriginalView
            chapter={{ ...chapter, originalText: editableOriginalText }}
            isEditing={isEditingOriginal}
            onTextChange={setEditableOriginalText}
            highlights={shotData?.highlights.filter(h => h.sourceType === 'original') || []}
            showHighlights={shotData?.showHighlights || false}
            onCreateShot={shotData?.onCreateShot}
            onShotClick={shotData?.onShotClick}
            enableShotSelection={enableShotSelection}
            onToggleEdit={async () => {
              // If exiting editing mode, auto-save changes
              if (isEditingOriginal) {
                const updatedChapter = {
                  ...chapter,
                  originalText: editableOriginalText,
                  processedText: editableText
                };
                onTextUpdate(updatedChapter);
                await updateOriginalText(editableOriginalText);
                await createVersion(editableOriginalText);
                
                toast({
                  title: "Changes saved",
                  description: "Your original text edits have been saved automatically."
                });
              }
              
              setIsEditingOriginal(!isEditingOriginal);
            }}
          />
        );
      case 'script':
        return (
          <ScriptView
            chapter={{ ...chapter, processedText: editableText }}
            isEditing={isEditingScript}
            onTextChange={setEditableText}
            highlights={shotData?.highlights.filter(h => h.sourceType === 'processed') || []}
            showHighlights={shotData?.showHighlights || false}
            onCreateShot={shotData?.onCreateShot}
            onShotClick={shotData?.onShotClick}
            enableShotSelection={enableShotSelection}
            onToggleEdit={async () => {
              // If exiting editing mode, auto-save changes
              if (isEditingScript) {
                const updatedChapter = {
                  ...chapter,
                  originalText: editableOriginalText,
                  processedText: editableText
                };
                onTextUpdate(updatedChapter);
                await updateProcessedText(chapter.id, editableText);
                await createVersion(editableText);
                
                toast({
                  title: "Changes saved",
                  description: "Your script edits have been saved automatically."
                });
              }
              
              setIsEditingScript(!isEditingScript);
            }}
          />
        );
      case 'shot-list':
        return (
          <ShotListView 
            chapter={chapter} 
            storyboardMode={storyboardMode}
            onShotDataChange={enableShotSelection ? setShotData : undefined}
          />
        );
      default:
        return null;
    }
  };

  const layoutMode = getLayoutMode(selectedViews);
  const sortedViews = sortViews(selectedViews);
  return <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border p-4 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{chapter.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {chapter.type === 'chapter' ? 'Novel Chapter' : 'Screenplay Scene'}
              </Badge>
              {chapter.processedText && <Badge variant="secondary">Processed</Badge>}
              {isLoadingContent && <Badge variant="outline">Loading...</Badge>}
            </div>
          </div>
          
          {/* Quota Reset Component - Admin Only */}
          {isAdmin && <QuotaReset />}
          
          <div className="flex items-center gap-2">
            
            {chapter.processedText && <VersionManager episodeId={chapter.id} // Using chapter ID as episode ID for now
          currentContent={isEditingOriginal ? editableOriginalText : editableText} onVersionRestore={handleVersionRestore} />}
            
            {!chapter.processedText ? <Button onClick={handleProcessWithAI} disabled={isProcessing || isLoadingContent} className="gap-2">
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 
                 isLoadingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                 <Wand2 className="h-4 w-4" />}
                {isProcessing ? 'Processing...' : 
                 isLoadingContent ? 'Loading...' : 
                 'Process Chapter'}
              </Button> : <>
                <Button onClick={handleSave} variant="outline" size="icon">
                  <Save className="h-4 w-4" />
                </Button>
                <Button onClick={handleProcessWithAI} disabled={isProcessing || isLoadingContent} variant="outline" className="gap-2">
                  {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 
                   isLoadingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                   <RefreshCw className="h-4 w-4" />}
                  {isProcessing ? 'Reprocessing...' : 
                   isLoadingContent ? 'Loading...' : 
                   'Reprocess'}
                </Button>
              </>}
          </div>
        </div>

        {/* View Selection Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <ViewSelector
              selectedViews={selectedViews}
              onViewToggle={onViewToggle}
              storyboardMode={storyboardMode}
              onStoryboardToggle={onStoryboardToggle}
            />
            
            {chapter.processedText && <Button variant="outline" size="sm" onClick={handleGenerateReports} disabled={isGeneratingReports} className="gap-2">
                {isGeneratingReports ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {isGeneratingReports ? 'Generating...' : 'Generate Reports'}
              </Button>}

            {chapter.reports && <Button variant={showReports ? "default" : "outline"} size="sm" onClick={() => setShowReports(!showReports)} className="gap-2">
                <FileText className="h-4 w-4" />
                Reports
              </Button>}
          </div>
          
          {/* Current Prompt Indicator */}
          <button 
            onClick={() => setShowPromptManager(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mx-[16px] underline decoration-dotted"
          >
            Prompt: {currentPrompt || 'No prompt selected'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 bg-writer-bg">
        {showReports && chapter.reports ? <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sound Effects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chapter.reports.soundEffects.length > 0 ? chapter.reports.soundEffects.map((effect, index) => <div key={index} className="text-sm p-2 bg-muted rounded">
                        {effect}
                      </div>) : <p className="text-sm text-muted-foreground">No sound effects identified</p>}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Characters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chapter.reports.characters.length > 0 ? chapter.reports.characters.map((character, index) => <div key={index} className="text-sm p-2 bg-muted rounded">
                        {character}
                      </div>) : <p className="text-sm text-muted-foreground">No characters identified</p>}
                </div>
              </CardContent>
            </Card>
          </div> : null}
        {layoutMode === 'side-by-side' ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {sortedViews.map((viewType, index) => (
              <React.Fragment key={viewType}>
                <ResizablePanel defaultSize={100 / sortedViews.length}>
                  <Card className="h-full">
                    <CardContent className="h-full p-4">
                      {renderView(viewType, chapter)}
                    </CardContent>
                  </Card>
                </ResizablePanel>
                {index < sortedViews.length - 1 && (
                  <ResizableHandle withHandle />
                )}
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        ) : (
          <Card className="h-full">
            <CardContent className="h-full p-4">
              {renderView(sortedViews[0], chapter)}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Prompt Manager Dialog */}
      {showPromptManager && (
        <PromptManager 
          onPromptSelect={handlePromptSelect} 
          onClose={() => setShowPromptManager(false)}
        />
      )}
    </div>;
}