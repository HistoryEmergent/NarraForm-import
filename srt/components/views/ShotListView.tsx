import React, { useState, useEffect } from 'react';
import { Chapter } from "@/types/chapter";
import { Shot, TextSelection, ShotType, SourceType, CameraMovement } from '@/types/shot';
import { SelectableText } from '@/components/SelectableText';
import { ShotEntry } from '@/components/ShotEntry';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, RotateCcw, Type, ChevronDown, ChevronUp } from 'lucide-react';


interface ShotListViewProps {
  chapter: Chapter;
  storyboardMode?: boolean;
  onShotDataChange?: (shotData: {
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
  }) => void;
}


export const ShotListView = ({ chapter, storyboardMode = false, onShotDataChange }: ShotListViewProps) => {
  const [shots, setShots] = useState<Shot[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>('processed');
  const [showHighlights, setShowHighlights] = useState(true);
  const [showSourceText, setShowSourceText] = useState(() => {
    const saved = localStorage.getItem('shot-list-show-source-text');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  // Auto-hide source text when integrated with other views
  const isIntegratedMode = !!onShotDataChange;
  const shouldShowSourceText = showSourceText && !isIntegratedMode;
  const [loading, setLoading] = useState(true);
  const [generatingDescriptions, setGeneratingDescriptions] = useState<Set<string>>(new Set());
  const [globalCollapsed, setGlobalCollapsed] = useState(true);
  
  const { toast } = useToast();


  useEffect(() => {
    loadShots();
  }, [chapter.id]);

  // Communicate shot data to parent when integration is enabled
  useEffect(() => {
    if (onShotDataChange) {
      const shotHighlights = shots.map(shot => ({
        startPosition: shot.startPosition,
        endPosition: shot.endPosition,
        shotType: shot.shotType,
        id: shot.id,
        sourceType: shot.sourceType
      }));

      onShotDataChange({
        highlights: shotHighlights,
        showHighlights,
        onCreateShot: handleCreateShot,
        onShotClick: handleShotClick
      });
    }
  }, [shots, showHighlights, onShotDataChange]);

  const loadShots = async () => {
    try {
      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('start_position', { ascending: true });

      if (error) throw error;

      const formattedShots: Shot[] = (data || []).map(shot => ({
        id: shot.id,
        chapterId: shot.chapter_id,
        projectId: shot.project_id,
        shotOrder: shot.shot_order,
        shotType: shot.shot_type as ShotType,
        cameraMovement: (shot.camera_movement as CameraMovement) || undefined,
        cameraMovementDescription: shot.camera_movement_description || undefined,
        sourceText: shot.source_text,
        sourceType: shot.source_type as SourceType,
        startPosition: shot.start_position,
        endPosition: shot.end_position,
        generatedDescription: shot.generated_description || undefined,
        userDescription: shot.user_description || undefined,
        createdAt: shot.created_at,
        updatedAt: shot.updated_at
      }));

      setShots(formattedShots);
    } catch (error) {
      console.error('Error loading shots:', error);
      toast({
        title: "Error",
        description: "Failed to load shots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShot = async (selection: TextSelection, shotType: ShotType) => {
    try {
      // Simple shot order - just use the current count + 1
      const newShotOrder = shots.length + 1;
      
      const { data, error } = await supabase
        .from('shots')
        .insert([{
          chapter_id: chapter.id,
          project_id: (chapter as any).project_id || chapter.id, // Fallback if project_id not available
          shot_order: newShotOrder,
          shot_type: shotType,
          source_text: selection.text,
          source_type: selection.sourceType,
          start_position: selection.startPosition,
          end_position: selection.endPosition
        }])
        .select()
        .single();

      if (error) throw error;

      const newShot: Shot = {
        id: data.id,
        chapterId: data.chapter_id,
        projectId: data.project_id,
        shotOrder: data.shot_order,
        shotType: data.shot_type as ShotType,
        cameraMovement: (data.camera_movement as CameraMovement) || undefined,
        cameraMovementDescription: data.camera_movement_description || undefined,
        sourceText: data.source_text,
        sourceType: data.source_type as SourceType,
        startPosition: data.start_position,
        endPosition: data.end_position,
        generatedDescription: data.generated_description || undefined,
        userDescription: data.user_description || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Update local state and reorder by text position
      const updatedShots = [...shots, newShot].sort((a, b) => a.startPosition - b.startPosition);
      setShots(updatedShots);

      toast({
        title: "Shot created",
        description: "New shot added to the list"
      });

      // Auto-generate description
      generateDescription(newShot.id);
    } catch (error) {
      console.error('Error creating shot:', error);
      toast({
        title: "Error",
        description: "Failed to create shot",
        variant: "destructive"
      });
    }
  };


  const handleUpdateShot = async (shotId: string, updates: Partial<Shot>) => {
    try {
      const { error } = await supabase
        .from('shots')
        .update({
          shot_type: updates.shotType,
          camera_movement: updates.cameraMovement,
          camera_movement_description: updates.cameraMovementDescription,
          user_description: updates.userDescription
        })
        .eq('id', shotId);

      if (error) throw error;

      setShots(shots.map(shot => 
        shot.id === shotId ? { ...shot, ...updates } : shot
      ));

      toast({
        title: "Shot updated",
        description: "Changes saved successfully"
      });
    } catch (error) {
      console.error('Error updating shot:', error);
      toast({
        title: "Error",
        description: "Failed to update shot",
        variant: "destructive"
      });
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId);

      if (error) throw error;

      setShots(shots.filter(shot => shot.id !== shotId));

      toast({
        title: "Shot deleted",
        description: "Shot removed from the list"
      });
    } catch (error) {
      console.error('Error deleting shot:', error);
      toast({
        title: "Error",
        description: "Failed to delete shot",
        variant: "destructive"
      });
    }
  };

  const handleExtendText = async (shotId: string, newStartPosition: number, newEndPosition: number) => {
    try {
      const sourceText = sourceType === 'original' ? chapter.originalText : chapter.processedText || '';
      const newSourceText = sourceText.slice(newStartPosition, newEndPosition);
      
      const { error } = await supabase
        .from('shots')
        .update({
          start_position: newStartPosition,
          end_position: newEndPosition,
          source_text: newSourceText
        })
        .eq('id', shotId);

      if (error) throw error;

      setShots(shots.map(shot => 
        shot.id === shotId 
          ? { 
              ...shot, 
              startPosition: newStartPosition, 
              endPosition: newEndPosition,
              sourceText: newSourceText
            } 
          : shot
      ));

      toast({
        title: "Text range updated",
        description: "Shot text has been extended/shrunk"
      });
    } catch (error) {
      console.error('Error extending text:', error);
      toast({
        title: "Error",
        description: "Failed to update text range",
        variant: "destructive"
      });
    }
  };

  const generateDescription = async (shotId: string) => {
    setGeneratingDescriptions(prev => new Set(prev).add(shotId));
    
    try {
      const shot = shots.find(s => s.id === shotId);
      if (!shot) return;

      // Get surrounding context (more text around the shot)
      const sourceText = sourceType === 'original' ? chapter.originalText : chapter.processedText || '';
      const contextStart = Math.max(0, shot.startPosition - 200);
      const contextEnd = Math.min(sourceText.length, shot.endPosition + 200);
      const context = sourceText.slice(contextStart, contextEnd);

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
      const shotProvider = settings?.edgeFunctionModels?.shotDescription?.provider || 'default';
      const provider = shotProvider === 'default' ? settings?.defaultProvider || 'gemini' : shotProvider;
      const model = shotProvider === 'default' ? 
        getDefaultModelForProvider(settings?.defaultProvider || 'gemini') : 
        settings?.edgeFunctionModels?.shotDescription?.model || getDefaultModelForProvider(shotProvider);

      console.log('Calling generate-shot-description with provider:', provider);
      const { data, error } = await supabase.functions.invoke('generate-shot-description', {
        body: {
          selectedText: shot.sourceText,
          context: context,
          shotType: shot.shotType,
          contentType: chapter.contentType || 'novel',
          provider,
          model,
          settings
        }
      });

      console.log('Generate-shot-description response:', { data, error });

      if (error) {
        console.error('Generate-shot-description error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from generate-shot-description function');
      }

      if (!data.description) {
        console.error('Description not found in response data:', data);
        throw new Error('No description generated');
      }

      const description = data.description;

      // Update database
      await supabase
        .from('shots')
        .update({ generated_description: description })
        .eq('id', shotId);

      // Update local state
      setShots(shots.map(s => 
        s.id === shotId ? { ...s, generatedDescription: description } : s
      ));

      toast({
        title: "Description generated",
        description: "AI description has been created"
      });
    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive"
      });
    } finally {
      setGeneratingDescriptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(shotId);
        return newSet;
      });
    }
  };

  const handleShotClick = (shotId: string) => {
    // Scroll to shot in the list
    const shotElement = document.getElementById(`shot-${shotId}`);
    if (shotElement) {
      shotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Blink the highlighted text
    const textElement = document.querySelector(`[data-shot-id="${shotId}"]`);
    if (textElement) {
      textElement.classList.add('animate-pulse');
      setTimeout(() => {
        textElement.classList.remove('animate-pulse');
      }, 2000);
    }
  };

  const getSourceText = () => {
    return sourceType === 'original' ? chapter.originalText : chapter.processedText || '';
  };

  const getCurrentHighlights = () => {
    return shots
      .filter(shot => shot.sourceType === sourceType)
      .map(shot => ({
        startPosition: shot.startPosition,
        endPosition: shot.endPosition,
        shotType: shot.shotType,
        id: shot.id
      }));
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Shot List</h3>
        <div className="bg-muted/30 p-4 rounded border flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading shots...</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Shot List</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="source-toggle" className="text-xs">
              Source: {sourceType === 'original' ? 'Original' : 'Processed'}
            </Label>
            <Switch
              id="source-toggle"
              checked={sourceType === 'processed'}
              onCheckedChange={(checked) => setSourceType(checked ? 'processed' : 'original')}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalCollapsed(!globalCollapsed)}
              title={globalCollapsed ? "Expand all details" : "Collapse all details"}
            >
              {globalCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            {!isIntegratedMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = !showSourceText;
                  setShowSourceText(newValue);
                  localStorage.setItem('shot-list-show-source-text', JSON.stringify(newValue));
                }}
                title="Toggle source text visibility"
                className="relative"
              >
                <Type className="h-4 w-4" />
                {!showSourceText && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-0.5 bg-current rotate-45 rounded-full" />
                  </div>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHighlights(!showHighlights)}
              title="Toggle highlights"
            >
              {showHighlights ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className={`${shouldShowSourceText ? 'grid grid-cols-2 gap-4' : 'flex'} flex-1 overflow-hidden`}>
        {shouldShowSourceText && (
          <div className="flex flex-col">
            <div className="text-xs font-medium mb-2 text-muted-foreground">
              Source Text ({sourceType})
            </div>
            <div className="flex-1 overflow-auto">
              <SelectableText
                text={getSourceText()}
                sourceType={sourceType}
                highlights={getCurrentHighlights()}
                showHighlights={showHighlights}
                onCreateShot={handleCreateShot}
                onShotClick={handleShotClick}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col">
          <div className="text-xs font-medium mb-2 text-muted-foreground">
            Shots ({shots.filter(s => s.sourceType === sourceType).length})
          </div>
          <div className="flex-1 overflow-auto">
            {shots.filter(shot => shot.sourceType === sourceType).length === 0 ? (
              <div className="bg-muted/30 p-4 rounded border text-center">
                <p className="text-sm text-muted-foreground">
                  No shots created yet. Select text to create your first shot.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {shots
                  .filter(shot => shot.sourceType === sourceType)
                  .map((shot, index) => (
                    <div key={shot.id} id={`shot-${shot.id}`}>
                       <ShotEntry
                         shot={shot}
                         index={index}
                         onUpdate={handleUpdateShot}
                         onDelete={handleDeleteShot}
                         onGenerateDescription={() => generateDescription(shot.id)}
                         isGenerating={generatingDescriptions.has(shot.id)}
                         storyboardMode={storyboardMode}
                         globalCollapsed={globalCollapsed}
                         onExtendText={handleExtendText}
                         allShots={shots.filter(s => s.sourceType === sourceType)}
                         onShotClick={handleShotClick}
                       />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};