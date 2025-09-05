import { ChevronRight, ChevronDown, FileText, Film, Play, Folder, Bot, RefreshCw, Zap, Settings, Expand, Minimize2 } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { processWithLLM } from "@/utils/llmApi";
import { geminiRateLimiter } from "@/utils/geminiRateLimiter";
import { getSettings } from "@/components/SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getChapterNumber } from "@/utils/chapterNumberUtils";
import { cleanChapterTitle } from "@/utils/chapterTitleUtils";
import { supabase } from "@/integrations/supabase/client";

import { ChapterMetadata, Chapter, Episode } from "@/types/chapter";

interface ProjectSidebarProps {
  chapters: ChapterMetadata[];
  episodes: Episode[];
  selectedChapter: any | null;
  onChapterSelect: (chapter: ChapterMetadata) => void;
  onChaptersUpdate: (chapters: ChapterMetadata[]) => void;
  onEpisodesUpdate: (episodes: Episode[]) => void;
  onChapterCreate: (chapter: ChapterMetadata, position?: {
    type: 'beginning' | 'end' | 'after';
    afterChapterId?: string;
  }) => void;
  onEpisodeCreate: (episode: Episode) => void;
  onChapterMerge: (mergedChapters: ChapterMetadata[]) => void;
  projectType: 'novel' | 'screenplay' | 'series';
  projectId: string;
  user?: any;
  onOpenProjectManager: () => void;
}

export function ProjectSidebar({
  chapters,
  episodes,
  selectedChapter,
  onChapterSelect,
  onChaptersUpdate,
  onEpisodesUpdate,
  onChapterCreate,
  onEpisodeCreate,
  onChapterMerge,
  projectType,
  projectId,
  user,
  onOpenProjectManager
}: ProjectSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { toast } = useToast();
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<string>>(new Set());

  // Force all episodes with chapters to be expanded and persist state
  useEffect(() => {
    const shouldExpand = new Set<string>(expandedEpisodes);
    episodes.forEach(episode => {
      const hasChapters = chapters.some(ch => ch.episodeId === episode.id);
      if (hasChapters) {
        shouldExpand.add(episode.id);
      }
    });

    // Only update state if there's a change to prevent infinite loops
    if (shouldExpand.size !== expandedEpisodes.size || Array.from(shouldExpand).some(id => !expandedEpisodes.has(id))) {
      setExpandedEpisodes(shouldExpand);
    }
  }, [chapters, episodes]);

  const getIcon = (type: 'chapter' | 'scene') => {
    return type === 'chapter' ? FileText : Film;
  };

  const handleProcessChapter = async (chapterId: string) => {
    const chapter = chapters?.find(ch => ch.id === chapterId);
    if (!chapter) return;
    
    const settings = getSettings();
    const model = settings?.geminiModel || 'gemini-2.5-pro';
    
    // Check rate limit before processing
    if (!geminiRateLimiter.canMakeRequest(model)) {
      const waitTime = Math.ceil(geminiRateLimiter.getWaitTime(model) / 1000);
      toast({
        title: "Rate Limit Reached",
        description: `Please wait ${waitTime} seconds before processing. ${geminiRateLimiter.getStatusMessage(model)}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Processing Chapter",
        description: `Starting AI processing for "${chapter.title}"...`
      });
      
      // Get chapter content from Supabase
      const { data: chapterData } = await supabase
        .from('chapters')
        .select('original_text')
        .eq('id', chapterId)
        .single();
      
      if (!chapterData?.original_text) {
        toast({
          title: "Processing Failed",
          description: "No content found for this chapter.",
          variant: "destructive"
        });
        return;
      }
      
      const result = await processWithLLM(chapterData.original_text, chapter.contentType);
      if (result.success && result.text) {
        // Update the chapter with processed text in database
        await supabase
          .from('chapters')
          .update({ processed_text: result.text })
          .eq('id', chapterId);
        
        const updatedChapter = {
          ...chapter,
          processedText: result.text
        };
        const newChapters = chapters.map(ch => ch.id === chapterId ? updatedChapter : ch);
        onChaptersUpdate(newChapters);
        toast({
          title: "Processing Complete",
          description: `"${chapter.title}" has been successfully processed.`
        });
      } else {
        toast({
          title: "Processing Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process chapter. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReprocessChapter = async (chapterId: string) => {
    const chapter = chapters?.find(ch => ch.id === chapterId);
    if (!chapter) return;
    const updatedChapter = {
      ...chapter
    };
    const newChapters = chapters.map(ch => ch.id === chapterId ? updatedChapter : ch);
    onChaptersUpdate(newChapters);
    toast({
      title: "Chapter Reset",
      description: "Chapter is ready for reprocessing with AI."
    });
  };

  const handleProcessAll = async () => {
    // Filter to only unprocessed chapters - handle undefined processing_count values
    const unprocessedChapters = chapters.filter(ch => {
      const processingCount = ch.processing_count;
      // Handle undefined objects and null/undefined values
      if (!processingCount || typeof processingCount === 'object') {
        return true; // Consider as unprocessed if undefined/null/object
      }
      return processingCount === 0;
    });
    
    console.log('ProcessAll: Starting with', unprocessedChapters.length, 'unprocessed chapters');
    console.log('ProcessAll: Chapter IDs to process:', unprocessedChapters.map(ch => ch.id));
    
    if (unprocessedChapters.length === 0) {
      toast({
        title: "No unprocessed chapters",
        description: "All chapters have already been processed."
      });
      return;
    }
    
    const settings = getSettings();
    const model = settings?.geminiModel || 'gemini-2.5-pro';
    const rateLimitStatus = geminiRateLimiter.getRateLimitStatus(model);
    
    setIsProcessingAll(true);
    const totalChapters = unprocessedChapters.length;
    let processed = 0;
    let failed = 0;
    const failedChapters: string[] = [];

    // Show initial rate limit status to user
    toast({
      title: "Starting Sequential Processing", 
      description: `Processing ${totalChapters} chapters. Current rate limit: ${rateLimitStatus.currentRequests}/${rateLimitStatus.maxRequests} requests used.`
    });

    // Process chapters one at a time with smart rate limiting
    for (let i = 0; i < unprocessedChapters.length; i++) {
      const chapter = unprocessedChapters[i];
      const remaining = totalChapters - i - 1;
      
      console.log(`ProcessAll: Starting chapter ${i + 1}/${totalChapters} - "${chapter.title}" (ID: ${chapter.id})`);
      
      try {
        // Check rate limit status before processing
        const currentStatus = geminiRateLimiter.getRateLimitStatus(model);
        if (!currentStatus.canRequest) {
          const waitSeconds = Math.ceil(currentStatus.waitTime / 1000);
          toast({
            title: "Rate Limit Reached",
            description: `Waiting ${waitSeconds} seconds before processing "${chapter.title}"...`
          });
          await geminiRateLimiter.waitForRateLimit(model);
        }
        // Update progress toast
        toast({
          title: `Processing Chapter ${i + 1} of ${totalChapters}`,
          description: `Processing "${chapter.title}"... (${remaining} chapters remaining)`
        });
        
        // Get chapter content and initial processing_count from Supabase
        console.log(`ProcessAll: Fetching content for chapter ${chapter.id}`);
        const { data: chapterData, error: fetchError } = await supabase
          .from('chapters')
          .select('original_text, processing_count')
          .eq('id', chapter.id)
          .single();
        
        const initialProcessingCount = chapterData?.processing_count || 0;
        
        if (fetchError) {
          console.error(`ProcessAll: Database fetch error for chapter ${chapter.id}:`, fetchError);
          throw new Error(`Database fetch failed: ${fetchError.message}`);
        }
        
        if (!chapterData?.original_text) {
          console.error(`ProcessAll: No original_text found for chapter ${chapter.id}`);
          toast({
            title: `Chapter ${i + 1} Failed`,
            description: `No content found for "${chapter.title}". ${remaining} chapters remaining.`,
            variant: "destructive"
          });
          failed++;
          failedChapters.push(chapter.title);
          continue;
        }
        
        console.log(`ProcessAll: Processing chapter ${chapter.id} with LLM (${chapterData.original_text.length} characters)`);
        
        // Process with LLM (rate limiting is handled inside processWithLLM now)
        const result = await processWithLLM(chapterData.original_text, chapter.contentType);
        
        console.log(`ProcessAll: LLM result for chapter ${chapter.id}:`, {
          success: result.success,
          hasText: !!result.text,
          textLength: result.text?.length,
          error: result.error
        });
        
        if (result.success && result.text) {
          // Update the chapter with processed text in database
          console.log(`ProcessAll: Updating database for chapter ${chapter.id}`);
          const { error: updateError } = await supabase
            .from('chapters')
            .update({ processed_text: result.text })
            .eq('id', chapter.id);
          
          if (updateError) {
            console.error(`ProcessAll: Database update error for chapter ${chapter.id}:`, updateError);
            throw new Error(`Database update failed: ${updateError.message}`);
          }
          
          // Validate that the update worked and trigger fired by re-fetching
          console.log(`ProcessAll: Validating database update for chapter ${chapter.id}`);
          const { data: validationData } = await supabase
            .from('chapters')
            .select('processed_text, processing_count')
            .eq('id', chapter.id)
            .single();
          
          const newProcessingCount = validationData?.processing_count || 0;
          
          if (!validationData?.processed_text) {
            console.error(`ProcessAll: Validation failed - processed_text not saved for chapter ${chapter.id}`);
            throw new Error('Processed text was not saved to database');
          }
          
          if (newProcessingCount <= initialProcessingCount) {
            console.error(`ProcessAll: Validation failed - processing_count not incremented for chapter ${chapter.id}. Before: ${initialProcessingCount}, After: ${newProcessingCount}`);
            throw new Error('Processing count was not incremented - database trigger may have failed');
          }
          
          console.log(`ProcessAll: Validation successful - processing_count incremented from ${initialProcessingCount} to ${newProcessingCount}`);
          
          // Small buffer to ensure database consistency after trigger
          await new Promise(resolve => setTimeout(resolve, 200));
          
          console.log(`ProcessAll: Successfully processed and saved chapter ${chapter.id}`);
          
          // Force refresh chapter data to ensure UI updates
          const { data: refreshedChapters } = await supabase
            .from('chapters')
            .select('*')
            .eq('project_id', projectId)
            .order('chapter_order');
          
          if (refreshedChapters) {
            const mappedChapters = refreshedChapters.map(ch => ({
              id: ch.id,
              title: ch.title,
              type: ch.type as 'chapter' | 'scene' || 'chapter',
              contentType: ch.content_type as 'novel' | 'screenplay' || 'novel',
              episodeId: ch.episode_id || undefined,
              character_count: ch.character_count,
              processing_count: ch.processing_count || 0,
              processedText: ch.processed_text
            }));
            onChaptersUpdate(mappedChapters);
          }
          
          processed++;
          
          // Show progress with rate limit status
          const nextStatus = geminiRateLimiter.getRateLimitStatus(model);
          toast({
            title: `Chapter ${i + 1} Complete`,
            description: `"${chapter.title}" processed successfully. ${remaining} chapters remaining. Rate limit: ${nextStatus.currentRequests}/${nextStatus.maxRequests} requests used.`
          });
        } else {
          console.error(`ProcessAll: LLM processing failed for chapter ${chapter.id}:`, result.error);
          failed++;
          failedChapters.push(chapter.title);
          toast({
            title: `Chapter ${i + 1} Failed`,
            description: `LLM processing failed for "${chapter.title}": ${result.error || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error(`ProcessAll: Unexpected error for chapter ${chapter.id}:`, error);
        failed++;
        failedChapters.push(chapter.title);
        toast({
          title: `Chapter ${i + 1} Error`,
          description: `Error processing "${chapter.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        
        // Ask user if they want to continue with remaining chapters
        if (remaining > 0) {
          const continueProcessing = confirm(`Failed to process "${chapter.title}". Continue with remaining ${remaining} chapters?`);
          if (!continueProcessing) {
            toast({
              title: "Processing Stopped by User",
              description: `Processing stopped. ${remaining} chapters remain unprocessed.`
            });
            break;
          }
        }
      }
    }
    
    setIsProcessingAll(false);
    
    console.log(`ProcessAll: Batch complete - ${processed} successful, ${failed} failed`);
    if (failedChapters.length > 0) {
      console.log('ProcessAll: Failed chapters:', failedChapters);
    }
    
    // Final refresh to ensure UI is up to date
    const { data: finalRefreshChapters } = await supabase
      .from('chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_order');
    
    if (finalRefreshChapters) {
      const mappedChapters = finalRefreshChapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        type: ch.type as 'chapter' | 'scene' || 'chapter',
        contentType: ch.content_type as 'novel' | 'screenplay' || 'novel',
        episodeId: ch.episode_id || undefined,
        character_count: ch.character_count,
        processing_count: ch.processing_count || 0,
        processedText: ch.processed_text
      }));
      onChaptersUpdate(mappedChapters);
    }
    
    toast({
      title: "Sequential Processing Complete",
      description: `${processed} chapters processed successfully${failed > 0 ? `, ${failed} failed` : ''}. UI refreshed.`,
      variant: failed > 0 ? "destructive" : "default"
    });
  };

  const forceExpandAll = () => {
    const allEpisodeIds = new Set(episodes.map(ep => ep.id));
    setExpandedEpisodes(allEpisodeIds);
    toast({
      title: "Expanded All Episodes",
      description: `Expanded ${episodes.length} episodes to show all chapters.`
    });
  };

  const forceCollapseAll = () => {
    setExpandedEpisodes(new Set());
    toast({
      title: "Collapsed All Episodes",
      description: "All episodes have been collapsed."
    });
  };

  const unprocessedCount = chapters?.filter(ch => {
    // Check for actual processed text content instead of processing_count
    return !ch.processedText || ch.processedText.trim() === '';
  }).length || 0;
  
  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  // Wrapper functions to handle individual updates
  const handleChapterUpdate = (chapterId: string, updates: Partial<ChapterMetadata>) => {
    const updatedChapters = chapters.map(ch => ch.id === chapterId ? {
      ...ch,
      ...updates
    } : ch);
    onChaptersUpdate(updatedChapters);
  };

  const handleEpisodeUpdate = (episodeId: string, updates: Partial<Episode>) => {
    const updatedEpisodes = episodes.map(ep => ep.id === episodeId ? {
      ...ep,
      ...updates
    } : ep);
    onEpisodesUpdate(updatedEpisodes);
  };

  const handleChapterDelete = (chapterIds: string[]) => {
    const filteredChapters = chapters.filter(ch => !chapterIds.includes(ch.id));
    onChaptersUpdate(filteredChapters);
  };

  return (
    <Sidebar className={cn("transition-all duration-300 ease-in-out border-r", collapsed ? "w-16" : "w-72")} collapsible="icon">
      <SidebarContent className="bg-card py-2 flex-1 !overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="py-[50px]">
          <div className={cn("flex items-center justify-between px-2 py-1", collapsed && "justify-center")}>
            {!collapsed && (
              <>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                  Project Structure
                </SidebarGroupLabel>
                <div className="flex gap-1">
                  {episodes.length > 0 && (
                    <>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={forceExpandAll} 
                        className="h-6 px-1 text-xs" 
                        title="Expand All Episodes"
                      >
                        <Expand className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={forceCollapseAll} 
                        className="h-6 px-1 text-xs" 
                        title="Collapse All Episodes"
                      >
                        <Minimize2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {onChapterCreate && (
                    <Button size="sm" variant="outline" onClick={onOpenProjectManager} className="h-6 px-1 text-xs" title="Manage Content">
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
            
            {collapsed && (
              <div className="text-xs text-muted-foreground font-mono">
                {chapters.length}
              </div>
            )}
          </div>
          
          {!collapsed && unprocessedCount > 0 && (
            <div className="px-2 pb-2">
              <Button onClick={handleProcessAll} disabled={isProcessingAll} variant="outline" size="sm" className="w-full gap-1 h-7 text-xs">
                <Zap className="h-3 w-3" />
                {isProcessingAll ? "Processing..." : `Process All (${unprocessedCount})`}
              </Button>
            </div>
          )}
            
          <SidebarGroupContent>
            <SidebarMenu>
              {(chapters?.length || 0) === 0 ? (
                <div className={cn("p-3 text-center", collapsed && "hidden")}>
                  <div className="text-xs text-muted-foreground">
                    No chapters yet
                  </div>
                </div>
              ) : (
                <>
                  {/* Sort all chapters by chapter_order for sequential display */}
                  {(() => {
                    // Sort chapters by chapter_order (sequential ordering)
                    const sortedChapters = chapters?.sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0)) || [];
                    const episodeMap = new Map(episodes?.map(ep => [ep.id, ep]) || []);
                    const renderedItems: JSX.Element[] = [];
                    const processedEpisodes = new Set<string>();
                    
                    sortedChapters.forEach((chapter, chapterIndex) => {
                      // If this is an inter-episode chapter (no episodeId)
                      if (!chapter.episodeId) {
                        const Icon = getIcon(chapter.type);
                        const isSelected = selectedChapter?.id === chapter.id;
                        const chapterNum = getChapterNumber(chapter, chapterIndex + 1, { maxReasonable: 100 });
                        
                        if (collapsed) {
                          renderedItems.push(
                             <SidebarMenuItem key={chapter.id} className={cn(
                               "border-l-2", 
                               (!chapter.processedText && isProcessingAll) ? "border-yellow-500" :
                               (!chapter.processedText || chapter.processedText.trim() === '') ? "border-red-500" : "border-green-500"
                             )}>
                              <SidebarMenuButton onClick={() => onChapterSelect(chapter)} className={cn("w-full justify-center p-1 h-7", isSelected && "bg-accent text-accent-foreground")} title={cleanChapterTitle(chapter.title)}>
                                <div className="flex items-center gap-1">
                                  <div className="text-xs font-mono">
                                    [{chapterNum}]
                                  </div>
                                </div>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        } else {
                           renderedItems.push(
                              <SidebarMenuItem key={chapter.id} className={cn(
                                "py-0 border-l-2 pl-2", 
                                (!chapter.processedText && isProcessingAll) ? "border-yellow-500" :
                                (!chapter.processedText || chapter.processedText.trim() === '') ? "border-red-500" : "border-green-500"
                              )}>
                                <SidebarMenuButton onClick={() => onChapterSelect(chapter)} className={cn("w-full justify-start p-2 h-8", isSelected && "bg-accent text-accent-foreground")}>
                                  <div className="flex items-center gap-2 w-full min-w-0">
                                    <div className="text-xs font-mono flex-shrink-0 text-muted-foreground">
                                      [{chapterNum}]
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="text-sm truncate py-0">
                                        {cleanChapterTitle(chapter.title)}
                                      </div>
                                    </div>
                                    <ChevronRight className={cn("h-3 w-3 transition-transform", isSelected && "rotate-90")} />
                                  </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        }
                        return;
                      }
                      
                      // If this is an episode chapter and we haven't processed this episode yet
                      if (chapter.episodeId && !processedEpisodes.has(chapter.episodeId)) {
                        processedEpisodes.add(chapter.episodeId);
                        const episode = episodeMap.get(chapter.episodeId);
                        if (!episode) return;
                        
                        const episodeChapters = sortedChapters.filter(ch => ch.episodeId === episode.id);
                        const isExpanded = expandedEpisodes.has(episode.id);
                        const episodeNumber = Array.from(processedEpisodes).length;
                        
                        if (collapsed) {
                          renderedItems.push(
                            <div key={episode.id} className="space-y-1 py-0">
                              <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => toggleEpisode(episode.id)} className="w-full justify-center p-2 h-8" title={`${episode.title} (${episodeChapters.length} chapters)`}>
                                  <div className="text-xs font-mono font-semibold">
                                    E{episodeNumber}
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              
                               {isExpanded && episodeChapters.map((epChapter, epChapterIndex) => {
                                 const isSelected = selectedChapter?.id === epChapter.id;
                                 const chapterNum = getChapterNumber(epChapter, epChapterIndex + 1, { maxReasonable: 100 });
                                 return (
                                    <SidebarMenuItem key={epChapter.id} className={cn(
                                      "border-l-2", 
                                      (!epChapter.processedText && isProcessingAll) ? "border-yellow-500" :
                                      (!epChapter.processedText || epChapter.processedText.trim() === '') ? "border-red-500" : "border-green-500"
                                    )}>
                                      <SidebarMenuButton onClick={() => onChapterSelect(epChapter)} className={cn("w-full justify-center p-1 h-7", isSelected && "bg-accent text-accent-foreground")} title={epChapter.title}>
                                        <div className="flex items-center gap-1">
                                          <div className="text-xs font-mono">
                                            {chapterNum}
                                          </div>
                                        </div>
                                      </SidebarMenuButton>
                                   </SidebarMenuItem>
                                 );
                               })}
                            </div>
                          );
                        } else {
                          renderedItems.push(
                            <div key={episode.id} className="space-y-0">
                              <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => toggleEpisode(episode.id)} className="w-full justify-start gap-2 p-2 h-8 font-medium">
                                  <div className="text-xs font-mono w-8 text-center">
                                    E{episodeNumber}
                                  </div>
                                  <span className="flex-1 text-left truncate text-sm">{episode.title}</span>
                                  {episodeChapters.length > 0 && (
                                    <Badge variant="secondary" className="h-4 text-xs px-1">
                                      {episodeChapters.length}
                                    </Badge>
                                  )}
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              
                               {isExpanded && episodeChapters.map((epChapter, epChapterIndex) => {
                                 const Icon = getIcon(epChapter.type);
                                 const isSelected = selectedChapter?.id === epChapter.id;
                                 const chapterNum = getChapterNumber(epChapter, epChapterIndex + 1, { maxReasonable: 100 });
                                 return (
                                    <SidebarMenuItem key={epChapter.id} className={cn(
                                      "py-0 border-l-2 pl-2 ml-4", 
                                      (!epChapter.processedText && isProcessingAll) ? "border-yellow-500" :
                                      (!epChapter.processedText || epChapter.processedText.trim() === '') ? "border-red-500" : "border-green-500"
                                    )}>
                                        <SidebarMenuButton onClick={() => onChapterSelect(epChapter)} className={cn("w-full justify-start p-2 h-8", isSelected && "bg-accent text-accent-foreground")}>
                                          <div className="flex items-center gap-2 w-full min-w-0">
                                            <div className="text-xs font-mono flex-shrink-0 text-muted-foreground">
                                              [{chapterNum}]
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                              <div className="text-sm truncate py-0">
                                                {cleanChapterTitle(epChapter.title)}
                                              </div>
                                            </div>
                                            <ChevronRight className={cn("h-3 w-3 transition-transform", isSelected && "rotate-90")} />
                                          </div>
                                        </SidebarMenuButton>
                                   </SidebarMenuItem>
                                 );
                               })}
                            </div>
                          );
                        }
                      }
                    });
                    
                    return renderedItems;
                  })()}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
