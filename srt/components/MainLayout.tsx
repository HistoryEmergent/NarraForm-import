import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./ProjectSidebar";
import { FileImportDialog } from "./FileImportDialog";
import { EditorView } from "./EditorView";
import { SettingsDialog } from "./SettingsDialog";
import { ProjectDropdown } from "./ProjectDropdown";
import { ManageProjectsDialog } from "./ManageProjectsDialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Settings, RefreshCw } from "lucide-react";
import { CollaboratorManager } from "./CollaboratorManager";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";
import { ExportManager } from "./ExportManager";
import { ChapterMetadata, Chapter, Episode } from "@/types/chapter";
import { useChapterLoader } from "@/hooks/useChapterLoader";
import { ViewType } from "@/types/viewMode";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
interface MainLayoutProps {
  selectedProject: string | null;
  onProjectSelect: (projectId: string | null) => void;
  selectedEpisode: string | null;
  onEpisodeSelect: (episodeId: string | null) => void;
  user: User;
}
export const MainLayout: React.FC<MainLayoutProps> = ({
  selectedProject,
  onProjectSelect,
  selectedEpisode,
  onEpisodeSelect,
  user
}) => {
  const [chapters, setChapters] = useState<ChapterMetadata[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isLoadingChapterContent, setIsLoadingChapterContent] = useState(false);
  
  // Add drag state management to prevent real-time conflicts
  const [isDragActive, setIsDragActive] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use chapter loader hook for efficient loading and caching
  const {
    chapterList,
    loadingStates,
    loadChapterMetadata,
    getFullChapter,
    clearCache
  } = useChapterLoader();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [selectedViews, setSelectedViews] = useState<ViewType[]>(() => {
    const saved = localStorage.getItem('selectedViews');
    return saved ? JSON.parse(saved) : ['original', 'script'];
  });
  const [storyboardMode, setStoryboardMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('storyboardMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [localProjects, setLocalProjects] = useState<any[]>([]);

  // Prevent infinite loops with loading flags
  const isLoadingProjectData = useRef(false);
  const hasTriedLoadingProject = useRef<string | null>(null);
  const isLoadingProjectList = useRef(false);
  const hasTriedLoadingProjectList = useRef(false);
  const [showProjectCreation, setShowProjectCreation] = useState(false);
  const {
    toast
  } = useToast();

  // Load project data from Supabase on mount - FIXED: Remove artificial delays
  useEffect(() => {
    let isMounted = true;
    if (selectedProject && user && hasTriedLoadingProject.current !== selectedProject) {
      hasTriedLoadingProject.current = selectedProject;
      setCurrentProjectId(selectedProject);
      console.log('Loading project data for:', selectedProject);

      // IMMEDIATE loading - no artificial delays
      loadProjectData(selectedProject).finally(() => {
        if (isMounted) {
          hasTriedLoadingProject.current = null;
        }
      });
    }

    // Handle project deselection (null/empty selection)
    if (!selectedProject && hasTriedLoadingProject.current !== 'empty') {
      hasTriedLoadingProject.current = 'empty';

      // IMMEDIATE UI cleanup when project is deselected
      setCurrentProjectId('');
      setChapters([]);
      setEpisodes([]);
      setSelectedChapter(null);
      setIsInitialLoad(true);
      console.log('Project deselected - cleared all data');
    }
    return () => {
      isMounted = false;
    };
  }, [selectedProject, user]);

  // Load project list for type detection
  useEffect(() => {
    let isMounted = true;
    if (user && !hasTriedLoadingProjectList.current) {
      hasTriedLoadingProjectList.current = true;
      loadProjectList().finally(() => {
        if (isMounted) {
          hasTriedLoadingProjectList.current = false;
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user]);
  const loadProjectList = async () => {
    if (isLoadingProjectList.current) return;
    isLoadingProjectList.current = true;
    try {
      const {
        data: supabaseProjects,
        error
      } = await supabase.from('projects').select('*').order('updated_at', {
        ascending: false
      });
      if (error) throw error;
      setProjects(supabaseProjects || []);

      // Load local projects from localStorage
      const savedLocal = localStorage.getItem('audiodrama-projects');
      if (savedLocal) {
        try {
          const localProjects = JSON.parse(savedLocal);
          setLocalProjects(localProjects);
        } catch {
          setLocalProjects([]);
        }
      }
    } catch (error) {
      console.error('Error loading project list:', error);
      // Don't retry automatically on error
    } finally {
      isLoadingProjectList.current = false;
    }
  };
  const loadProjectData = async (projectId: string) => {
    if (!projectId || !user || isLoadingProjectData.current) {
      console.log('LoadProjectData: Skipping', {
        projectId: !!projectId,
        user: !!user,
        isLoading: isLoadingProjectData.current
      });
      return;
    }
    isLoadingProjectData.current = true;
    try {
      console.log('LoadProjectData: Starting LAZY data load for project:', projectId);

      // Check if this is a local project ID (not a UUID) - fallback to local storage
      const isLocalProject = projectId.startsWith('project-');
      if (isLocalProject) {
        // Load from localStorage for legacy local projects
        const savedChapters = localStorage.getItem(`${projectId}-chapters`);
        const savedEpisodes = localStorage.getItem(`${projectId}-episodes`);
        if (savedChapters) {
          try {
            setChapters(JSON.parse(savedChapters));
          } catch {
            setChapters([]);
          }
        }
        if (savedEpisodes) {
          try {
            setEpisodes(JSON.parse(savedEpisodes));
          } catch {
            setEpisodes([]);
          }
        }
        return;
      }

      // CONSOLIDATED CACHE MANAGEMENT: Clear all project-related cache
      const clearProjectCache = (projectId: string) => {
        const keysToRemove = [`storyConverter_project_${projectId}`, `storyConverter_episodes_${projectId}`, `storyConverter_chapters_${projectId}`, `${projectId}-chapters`, `${projectId}-episodes`, `project-${projectId}`, `chapters_${projectId}`, `episodes_${projectId}`];
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      };
      clearProjectCache(projectId);
      console.log('Cleared all localStorage keys for project to ensure fresh data load');

      // Use chapter loader for metadata loading
      console.log('Loading chapter metadata using chapter loader...');
      const [chapterMetadata, episodesResponse] = await Promise.all([
        loadChapterMetadata(projectId),
        supabase.from('episodes').select('*').eq('project_id', projectId).order('episode_order')
      ]);
      const {
        data: episodesData,
        error: episodesError
      } = episodesResponse;
      if (!chapterMetadata && episodesError) {
        console.error('Error loading project data:', {
          episodesError
        });
        toast({
          title: "Error loading project data",
          description: "Failed to load chapters and episodes. Please try again later.",
          variant: "destructive"
        });
        return;
      }
      const allChapters: ChapterMetadata[] = [];
      const episodes: Episode[] = [];

      // Convert chapter metadata to ChapterMetadata interface format (no content)
      if (chapterMetadata && chapterMetadata.length > 0) {
        console.log(`Loading ${chapterMetadata.length} chapter metadata from database...`);
        chapterMetadata.forEach((ch) => {
          console.log('Loading chapter metadata:', ch.title, 'ID:', ch.id);
          allChapters.push({
            id: ch.id,
            title: ch.title || 'Untitled Chapter',
            type: ch.type as 'chapter' | 'scene' || 'chapter',
            contentType: ch.content_type as 'novel' | 'screenplay' || 'novel',
            episodeId: ch.episode_id || undefined,
            character_count: ch.character_count,
            processing_count: ch.processing_count || 0,
            processedText: ch.processed_text || undefined
          });
        });
      }

      // Process episodes - handle both old format (sections) and new format (chapter_ids)
      if (episodesData && episodesData.length > 0) {
        console.log(`Processing ${episodesData.length} episodes from database...`);
        episodesData.forEach(ep => {
          console.log(`Processing episode "${ep.title}"`);

          // Handle new format episodes (with chapter_ids)
          let parsedChapterIds = ep.chapter_ids;

          // Parse chapter_ids if it's a JSON string from the database
          if (typeof ep.chapter_ids === 'string') {
            try {
              parsedChapterIds = JSON.parse(ep.chapter_ids);
            } catch (error) {
              console.error(`Failed to parse chapter_ids for episode "${ep.title}":`, error);
              parsedChapterIds = [];
            }
          }
          if (parsedChapterIds && Array.isArray(parsedChapterIds) && parsedChapterIds.length > 0) {
            console.log(`Episode "${ep.title}" has ${parsedChapterIds.length} chapter IDs:`, parsedChapterIds);
            episodes.push({
              id: ep.id,
              title: ep.title || '',
              description: ep.description || '',
              chapterIds: parsedChapterIds.filter((id): id is string => typeof id === 'string')
            });
            return;
          }

          // Handle old format episodes (with sections) - legacy support
          const sections = Array.isArray(ep.sections) ? ep.sections : ep.sections ? [ep.sections] : [];
          console.log(`Episode "${ep.title}" has ${sections.length} sections (legacy format)`);

          // ONLY create legacy episodes that have actual content
          if (sections.length > 0 && sections.some((s: any) => s.content || s.originalText)) {
            // Add episode sections as chapters (metadata only) if they don't already exist in chapters table
            sections.forEach((section: any) => {
              const existingChapter = allChapters.find(ch => ch.id === section.id);
              if (!existingChapter && (section.content || section.originalText)) {
                allChapters.push({
                  id: section.id,
                  title: section.title,
                  type: section.type || 'chapter',
                  contentType: section.contentType || 'novel',
                  episodeId: ep.id
                });
              }
            });

            // Only add episodes that have actual chapters
            const validSections = sections.filter((s: any) => s.content || s.originalText);
            if (validSections.length > 0) {
              episodes.push({
                id: ep.id,
                title: ep.title || '',
                description: ep.processed_content ? String(ep.processed_content) : '',
                chapterIds: validSections.map((s: any, i: number) => s.id || `${ep.id}-section-${i}`)
              });
            }
          } else if (!ep.chapter_ids || !Array.isArray(ep.chapter_ids) || ep.chapter_ids.length === 0) {
            console.log(`Skipping empty episode: "${ep.title}" (no chapters or sections)`, {
              chapter_ids: ep.chapter_ids,
              episode_id: ep.id,
              project_id: ep.project_id
            });
          } else {
            console.log(`Processing episode: "${ep.title}" with ${ep.chapter_ids.length} chapters`, ep.chapter_ids);
          }
        });
      }
      console.log(`Successfully loaded ${allChapters.length} total chapters and ${episodes.length} episodes`);

      // Update state in a single batch to prevent flickering
      setEpisodes(episodes);
      setChapters(allChapters);

      // Load first chapter content if available
      if (allChapters.length > 0 && !selectedChapter) {
        await loadAndSelectChapter(allChapters[0].id);
      }
      setIsInitialLoad(false);
      toast({
        title: "Project Loaded",
        description: `Loaded ${allChapters.length} chapters${episodes.length > 0 ? ` and ${episodes.length} episodes` : ''}`
      });
    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data. Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      isLoadingProjectData.current = false;
    }
  };

  // Load and select chapter with content
  const loadAndSelectChapter = async (chapterId: string) => {
    setIsLoadingChapterContent(true);
    try {
      const metadata = chapters.find(ch => ch.id === chapterId);
      if (!metadata) {
        console.error('Chapter metadata not found:', chapterId);
        return;
      }

      // Load full content using chapter loader
      const fullChapter = await getFullChapter(chapterId);
      if (fullChapter) {
        const chapter: Chapter = {
          ...metadata,
          originalText: fullChapter.original_text,
          processedText: fullChapter.processed_text || undefined
        };
        setSelectedChapter(chapter);
        console.log('Loaded and selected chapter:', chapter.title);
      }
    } catch (error) {
      console.error('Error loading chapter content:', error);
      toast({
        title: "Error loading chapter",
        description: "Failed to load chapter content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingChapterContent(false);
    }
  };

  // Save chapter data to Supabase when chapters change
  useEffect(() => {
    if (currentProjectId && chapters.length > 0 && user && !isInitialLoad) {
      saveChaptersToSupabase();
    }
  }, [chapters, currentProjectId, user, isInitialLoad]);

  // REAL-TIME SYNC: Add Supabase subscriptions for immediate data updates
  useEffect(() => {
    if (!currentProjectId || currentProjectId.startsWith('project-')) return;
    console.log('Setting up real-time subscriptions for project:', currentProjectId);

    // Subscribe to chapter changes
    const chapterChannel = supabase.channel(`chapters-${currentProjectId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chapters',
      filter: `project_id=eq.${currentProjectId}`
    }, payload => {
      console.log('Chapter change detected:', payload, 'Drag active:', isDragActive);
      
      // Skip real-time updates during active drag operations to prevent conflicts
      if (isDragActive) {
        console.log('Skipping real-time update during drag operation');
        return;
      }
      
      if (payload.eventType === 'INSERT') {
        const newChapter = payload.new as any;
        setChapters(prev => {
          // Check if chapter already exists to prevent duplicates
          const exists = prev.find(ch => ch.id === newChapter.id);
          if (exists) return prev;
          return [...prev, {
            id: newChapter.id,
            title: newChapter.title || 'Untitled Chapter',
            type: newChapter.type as 'chapter' | 'scene' || 'chapter',
            contentType: newChapter.content_type as 'novel' | 'screenplay' || 'novel',
            episodeId: newChapter.episode_id || undefined,
            chapter_order: newChapter.chapter_order || 0,
            character_count: newChapter.character_count || 0,
            processing_count: newChapter.processing_count || 0
          }];
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedChapter = payload.new as any;
        console.log('Processing chapter UPDATE:', updatedChapter);
        setChapters(prev => {
          return prev.map(ch => 
            ch.id === updatedChapter.id 
              ? {
                  ...ch,
                  title: updatedChapter.title || ch.title,
                  type: updatedChapter.type || ch.type,
                  contentType: updatedChapter.content_type || ch.contentType,
                  episodeId: updatedChapter.episode_id || undefined,
                  chapter_order: updatedChapter.chapter_order ?? ch.chapter_order,
                  character_count: updatedChapter.character_count ?? ch.character_count,
                  processing_count: updatedChapter.processing_count ?? ch.processing_count
                }
              : ch
          );
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedChapter = payload.old as any;
        setChapters(prev => prev.filter(ch => ch.id !== deletedChapter.id));
      }
    }).subscribe();

    // Subscribe to episode changes
    const episodeChannel = supabase.channel(`episodes-${currentProjectId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'episodes',
      filter: `project_id=eq.${currentProjectId}`
    }, payload => {
      console.log('Episode change detected:', payload, 'Drag active:', isDragActive);
      
      // Skip real-time updates during active drag operations to prevent conflicts
      if (isDragActive) {
        console.log('Skipping real-time episode update during drag operation');
        return;
      }
      
      if (payload.eventType === 'INSERT') {
        const newEpisode = payload.new as any;
        setEpisodes(prev => {
          // Check if episode already exists to prevent duplicates
          const exists = prev.find(ep => ep.id === newEpisode.id);
          if (exists) return prev;
          return [...prev, {
            id: newEpisode.id,
            title: newEpisode.title || '',
            description: newEpisode.description || '',
            chapterIds: Array.isArray(newEpisode.chapter_ids) ? newEpisode.chapter_ids : []
          }];
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedEpisode = payload.new as any;
        console.log('Processing episode UPDATE:', updatedEpisode);
        setEpisodes(prev => {
          return prev.map(ep => 
            ep.id === updatedEpisode.id 
              ? {
                  ...ep,
                  title: updatedEpisode.title || ep.title,
                  description: updatedEpisode.description || ep.description,
                  chapterIds: Array.isArray(updatedEpisode.chapter_ids) 
                    ? updatedEpisode.chapter_ids 
                    : ep.chapterIds
                }
              : ep
          );
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedEpisode = payload.old as any;
        setEpisodes(prev => prev.filter(ep => ep.id !== deletedEpisode.id));
      }
    }).subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up real-time subscriptions for project:', currentProjectId);
      supabase.removeChannel(chapterChannel);
      supabase.removeChannel(episodeChannel);
    };
  }, [currentProjectId, isDragActive]);

  // Helper function to set drag state with timeout
  const setDragActiveWithTimeout = (active: boolean) => {
    setIsDragActive(active);
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    if (active) {
      // Clear drag state after 3 seconds to prevent permanent blocking
      dragTimeoutRef.current = setTimeout(() => {
        console.log('Clearing drag state due to timeout');
        setIsDragActive(false);
      }, 3000);
    }
  };

  // Save episode data to Supabase when episodes change
  useEffect(() => {
    if (currentProjectId && episodes.length > 0 && user && !isInitialLoad) {
      saveEpisodesToSupabase();
    }
  }, [episodes, currentProjectId, user, isInitialLoad]);
  const saveEpisodesToSupabase = async () => {
    if (!currentProjectId || !user) return;

    // Don't save to Supabase if this is a local project
    if (currentProjectId.startsWith('project-')) {
      localStorage.setItem(`${currentProjectId}-episodes`, JSON.stringify(episodes));
      return;
    }
    try {
      // Update episodes with proper order and chapter assignments
      const episodesToUpsert = episodes.map((episode, index) => ({
        id: episode.id,
        project_id: currentProjectId,
        title: episode.title,
        description: episode.description,
        original_content: episode.description || '',
        // Add required field
        chapter_ids: JSON.stringify(episode.chapterIds),
        episode_order: index + 1,
        updated_at: new Date().toISOString()
      }));
      const {
        error: episodesError
      } = await supabase.from('episodes').upsert(episodesToUpsert);
      if (episodesError) {
        console.error('Error saving episodes:', episodesError);
        throw episodesError;
      }
    } catch (error) {
      console.error('Error saving episodes:', error);
    }
  };
  const saveChaptersToSupabase = async () => {
    if (!currentProjectId || !user) return;

    // Don't save to Supabase if this is a local project
    if (currentProjectId.startsWith('project-')) {
      localStorage.setItem(`${currentProjectId}-chapters`, JSON.stringify(chapters));
      return;
    }

    try {
      console.log('Saving chapters while preserving existing order...');
      
      // PRESERVE existing chapter_order values, don't reassign based on array position
      const chaptersToUpdate = chapters.map(chapter => {
        console.log(`Chapter "${chapter.title}": episodeId=${chapter.episodeId}, chapter_order=${chapter.chapter_order} (preserving existing order)`);

        return {
          id: chapter.id,
          episode_id: chapter.episodeId || null,
          chapter_order: chapter.chapter_order, // Keep existing order, don't reassign
          position: null, // No longer using position
          relative_to_episode: null, // No longer using relative positioning
          updated_at: new Date().toISOString()
        };
      });

      // Batch update all chapters
      for (const chapterUpdate of chaptersToUpdate) {
        // Find the current chapter data to preserve content
        const currentChapter = chapters.find(ch => ch.id === chapterUpdate.id);
        // Also check selectedChapter for more complete data
        const fullChapter = selectedChapter?.id === chapterUpdate.id ? selectedChapter : null;
        
        // Prepare update object - NEVER overwrite original_text with title or empty content
        const updateData: any = {
          episode_id: chapterUpdate.episode_id,
          updated_at: chapterUpdate.updated_at
        };

        // Only update chapter_order if it exists (don't set null/undefined values)
        if (chapterUpdate.chapter_order !== undefined && chapterUpdate.chapter_order !== null) {
          updateData.chapter_order = chapterUpdate.chapter_order;
        }

        // Only update content fields if we have the actual full content
        if (fullChapter?.originalText && fullChapter.originalText.length > 100) {
          updateData.original_text = fullChapter.originalText;
        }
        if (fullChapter?.processedText) {
          updateData.processed_text = fullChapter.processedText;
        }
        
        console.log(`Updating chapter ${chapterUpdate.id}, preserving content fields:`, {
          hasOriginalText: !!fullChapter?.originalText,
          originalTextLength: fullChapter?.originalText?.length || 0,
          hasProcessedText: !!fullChapter?.processedText,
          preservedOrder: chapterUpdate.chapter_order
        });
        
        await supabase
          .from('chapters')
          .update(updateData)
          .eq('id', chapterUpdate.id);
      }
      
      console.log('Successfully saved chapters while preserving order');
    } catch (error) {
      console.error('Error saving chapters:', error);
    }
  };

  // Function to reset chapter order based on chapter numbers in titles
  const resetChapterOrder = async () => {
    if (!currentProjectId || !user || currentProjectId.startsWith('project-')) return;

    try {
      console.log('Resetting chapter order based on title numbers...');
      
      // Get all chapters for this project from database
      const { data: dbChapters, error } = await supabase
        .from('chapters')
        .select('id, title, chapter_order')
        .eq('project_id', currentProjectId);
        
      if (error) {
        console.error('Error fetching chapters:', error);
        return;
      }

      // Extract chapter numbers from titles and create updates
      const updates = dbChapters.map(chapter => {
        // Extract number from title (handles formats like "1\n\nChapter Title" or "1 Chapter Title")
        const titleMatch = chapter.title?.match(/^(\d+)(?:\n|\s|$)/);
        const chapterNumber = titleMatch ? parseInt(titleMatch[1], 10) : null;
        
        console.log(`Chapter "${chapter.title}": extracted number = ${chapterNumber}, current order = ${chapter.chapter_order}`);
        
        return {
          id: chapter.id,
          newOrder: chapterNumber,
          title: chapter.title
        };
      }).filter(update => update.newOrder !== null); // Only include chapters with valid numbers

      // Sort by extracted chapter number to ensure proper order
      updates.sort((a, b) => a.newOrder! - b.newOrder!);

      // Update database with corrected order
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ chapter_order: update.newOrder })
          .eq('id', update.id);
          
        if (updateError) {
          console.error(`Error updating chapter ${update.id}:`, updateError);
        } else {
          console.log(`Updated chapter "${update.title}" to order ${update.newOrder}`);
        }
      }

      // Refresh chapter data to reflect changes
      await loadChapterMetadata(currentProjectId);
      
      console.log('Chapter order reset completed');
      toast({
        title: "Chapter Order Reset",
        description: `Successfully reset order for ${updates.length} chapters based on their title numbers.`,
      });
      
    } catch (error) {
      console.error('Error resetting chapter order:', error);
      toast({
        title: "Error",
        description: "Failed to reset chapter order. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleProjectSelect = (projectId: string) => {
    console.log('handleProjectSelect called with:', projectId);
    setCurrentProjectId(projectId);
    onProjectSelect(projectId);

    // IMMEDIATE data loading for instant UI feedback
    if (projectId) {
      loadProjectData(projectId);
    } else {
      // Clear data when no project selected
      setChapters([]);
      setEpisodes([]);
      setSelectedChapter(null);
    }
  };
  const handleFileImport = async (parsedContent: any, initialMedium: 'novel' | 'screenplay', outputMedium: string, fileName: string, createNewProject?: boolean, targetProjectId?: string) => {
    const projectId = targetProjectId || currentProjectId;
    
    if (createNewProject && !targetProjectId) {
      // Store file data for project creation workflow
      console.log('File import requested with new project creation, storing for later processing');
      setShowImportDialog(false);
      setShowProjectCreation(true);
      return;
    }
    
    if (!projectId) {
      toast({
        title: "No Project Selected",
        description: "Please select or create a project to import this file into."
      });
      setShowImportDialog(false);
      return;
    }
    try {
      console.log('Starting file import for project:', projectId);
      console.log('Parsed content sections:', parsedContent.sections);

      // First, save each section as an individual chapter with proper ordering
      const chapterInserts = parsedContent.sections.map((section: any, index: number) => ({
        id: section.id,
        project_id: projectId,
        title: section.title,
        original_text: section.content,
        type: section.type || 'chapter',
        content_type: initialMedium,
        chapter_order: index + 1, // Ensure proper sequential ordering
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      console.log('Inserting chapters:', chapterInserts.length);

      // Insert all chapters into the database
      const {
        data: chapterData,
        error: chapterError
      } = await supabase.from('chapters').insert(chapterInserts).select('*');
      if (chapterError) {
        console.error('Error inserting chapters:', chapterError);
        console.error('Failed chapter inserts:', chapterInserts);
        throw chapterError;
      }
      console.log('Successfully inserted chapters:', chapterData?.length);
      console.log('Inserted chapter data:', chapterData?.map(ch => ({ id: ch.id, title: ch.title, original_text_length: ch.original_text?.length || 0 })));

      // Create an episode that references these chapters
      const chapterIds = chapterData?.map(ch => ch.id) || [];
      const episodeData = {
        project_id: projectId,
        title: `Imported: ${fileName.replace(/\.[^/.]+$/, "")}`,
        original_content: parsedContent.sections.map((s: any) => s.content).join('\n\n'),
        description: `Imported from ${fileName}`,
        episode_order: await getNextEpisodeOrder(projectId),
        chapter_ids: chapterIds
      };
      console.log('Creating episode with chapter IDs:', chapterIds);

      // Insert episode into database
      const {
        data: episodeData_,
        error: episodeError
      } = await supabase.from('episodes').insert(episodeData).select('id').single();
      if (episodeError) {
        console.error('Error inserting episode:', episodeError);
        throw episodeError;
      }
      console.log('Successfully created episode:', episodeData_?.id);

      // IMMEDIATE UI UPDATE: Update state directly instead of reloading
      const newChapters = chapterData?.map((ch, index) => ({
        id: ch.id,
        title: parsedContent.sections[index]?.title || `Chapter ${index + 1}`,
        type: (parsedContent.sections[index]?.type || 'chapter') as 'chapter' | 'scene',
        contentType: initialMedium,
        episodeId: episodeData_?.id,
        chapter_order: index + 1, // Preserve sequential order in UI state
        originalText: ch.original_text, // Include content for immediate access
        processedText: ch.processed_text
      })) || [];
      const newEpisode: Episode = {
        id: episodeData_?.id || '',
        title: `Imported: ${fileName.replace(/\.[^/.]+$/, "")}`,
        description: `Imported from ${fileName}`,
        chapterIds: chapterIds
      };

      // Update state immediately for instant UI feedback
      setChapters(prev => [...prev, ...newChapters]);
      setEpisodes(prev => [...prev, newEpisode]);
      setShowImportDialog(false);
      toast({
        title: "Import Successful",
        description: `Imported ${chapterInserts.length} ${initialMedium === 'novel' ? 'chapters' : 'scenes'} from ${fileName}`
      });
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import file to database",
        variant: "destructive"
      });
    }
  };

  // Helper function to get next episode order
  const getNextEpisodeOrder = async (projectId: string): Promise<number> => {
    const {
      data,
      error
    } = await supabase.from('episodes').select('episode_order').eq('project_id', projectId).order('episode_order', {
      ascending: false
    }).limit(1);
    if (error || !data || data.length === 0) {
      return 1;
    }
    return (data[0].episode_order || 0) + 1;
  };
  const handleChaptersChange = (updatedChapters: ChapterMetadata[]) => {
    setChapters(updatedChapters);
    setIsInitialLoad(false); // Allow database save after changes
  };

  const handleChapterSelect = async (chapterId: string) => {
    await loadAndSelectChapter(chapterId);
  };

  const handleChapterSelectById = (chapter: Chapter) => {
    handleChapterSelect(chapter.id);
  };
  const handleReprocessChapter = async () => {
    if (!selectedChapter) return;

    // Clear the processed text to force reprocessing
    const updatedChapter = {
      ...selectedChapter,
      processedText: undefined
    };
    setChapters(prev => prev.map(c => c.id === updatedChapter.id ? updatedChapter : c));
    setSelectedChapter(updatedChapter);
    toast({
      title: "Chapter Reset",
      description: "Chapter is ready for reprocessing with AI."
    });
  };
  // Chapter order management system
  const updateChapterOrder = (chapters: ChapterMetadata[], episodeId: string): ChapterMetadata[] => {
    return chapters.map(chapter => {
      if (chapter.episodeId === episodeId) {
        const episodeChapters = chapters
          .filter(ch => ch.episodeId === episodeId)
          .sort((a, b) => {
            const aIndex = chapters.findIndex(ch => ch.id === a.id);
            const bIndex = chapters.findIndex(ch => ch.id === b.id);
            return aIndex - bIndex;
          });
        const chapterOrder = episodeChapters.findIndex(ch => ch.id === chapter.id) + 1;
        return { ...chapter, chapter_order: chapterOrder };
      }
      return chapter;
    });
  };

  const updateEpisodeChapterOrders = async (episodeId: string, chapterIds: string[]) => {
    if (!currentProjectId || currentProjectId.startsWith('project-')) return;

    try {
      for (let i = 0; i < chapterIds.length; i++) {
        await supabase
          .from('chapters')
          .update({ chapter_order: i + 1 })
          .eq('id', chapterIds[i]);
      }
    } catch (error) {
      console.error('Error updating chapter orders:', error);
    }
  };

  const handleCreateEpisode = async (episode: Episode) => {
    // Immediately save episode to database if we have a current project
    if (currentProjectId && !currentProjectId.startsWith('project-')) {
      try {
        const {
          error
        } = await supabase.from('episodes').insert({
          id: episode.id,
          project_id: currentProjectId,
          title: episode.title,
          description: episode.description,
          original_content: '',
          chapter_ids: JSON.stringify(episode.chapterIds),
          episode_order: episodes.length + 1
        });
        if (error) {
          console.error('Error saving episode:', error);
          toast({
            title: "Error",
            description: "Failed to save episode to database",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Error saving episode:', error);
        toast({
          title: "Error",
          description: "Failed to save episode to database",
          variant: "destructive"
        });
        return;
      }
    }
    setEpisodes(prev => [...prev, episode]);

    // Update chapters to assign them to this episode with proper chapter_order
    setChapters(prev => {
      const updatedChapters = prev.map((chapter, index) => {
        if (episode.chapterIds.includes(chapter.id)) {
          const chapterOrder = episode.chapterIds.indexOf(chapter.id) + 1;
          return { ...chapter, episodeId: episode.id, chapter_order: chapterOrder };
        }
        return chapter;
      });
      
      // Update chapter orders in database
      if (currentProjectId && !currentProjectId.startsWith('project-')) {
        updateEpisodeChapterOrders(episode.id, episode.chapterIds);
      }
      
      return updatedChapters;
    });
    setIsInitialLoad(false); // Ensure database save is triggered
    toast({
      title: "Episode Created",
      description: `"${episode.title}" has been created with ${episode.chapterIds.length} chapters.`
    });
  };
  const handleChapterReorder = (reorderedChapters: any[]) => {
    setChapters(reorderedChapters);
    setIsInitialLoad(false); // Ensure database save is triggered
    toast({
      title: "Chapter Moved",
      description: "Chapter has been moved to its new position."
    });
  };

  const handleChapterMerge = async (mergedChapters: any[]) => {
    // Identify chapters that were removed (original chapters that got merged)
    const currentChapterIds = new Set(chapters.map(ch => ch.id));
    const newChapterIds = new Set(mergedChapters.map(ch => ch.id));
    const removedChapterIds = Array.from(currentChapterIds).filter(id => !newChapterIds.has(id));

    // Delete the original source chapters from database
    if (removedChapterIds.length > 0 && !currentProjectId?.startsWith('project-')) {
      try {
        const {
          error
        } = await supabase.from('chapters').delete().in('id', removedChapterIds);
        if (error) {
          console.error('Error deleting original chapters from database:', error);
        }
      } catch (error) {
        console.error('Error deleting original chapters:', error);
      }
    }
    setChapters(mergedChapters);
    setIsInitialLoad(false); // Ensure database save is triggered
    toast({
      title: "Chapters Merged",
      description: "Selected chapters have been merged successfully."
    });
  };
  const handleChapterDelete = async (chapterIds: string[]) => {
    // Delete from database first (if not a local project)
    if (!currentProjectId?.startsWith('project-')) {
      try {
        const {
          error
        } = await supabase.from('chapters').delete().in('id', chapterIds);
        if (error) {
          console.error('Error deleting chapters from database:', error);
          toast({
            title: "Delete Failed",
            description: "Failed to delete chapters from database.",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Error deleting chapters:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete chapters.",
          variant: "destructive"
        });
        return;
      }
    }

    // Update local state
    setChapters(prev => prev.filter(ch => !chapterIds.includes(ch.id)));
    setEpisodes(prev => prev.map(ep => ({
      ...ep,
      chapterIds: ep.chapterIds.filter(id => !chapterIds.includes(id))
    })));

    // Clear selected chapter if it was deleted
    if (selectedChapter && chapterIds.includes(selectedChapter.id)) {
      setSelectedChapter(null);
    }
    toast({
      title: "Chapters Deleted",
      description: `${chapterIds.length === 1 ? 'Chapter has' : 'Chapters have'} been deleted successfully.`
    });
  };
  const handleChapterUpdate = (chapterId: string, updates: Partial<any>) => {
    // For metadata updates, we update the chapter list
    setChapters(prev => prev.map(ch => ch.id === chapterId ? { ...ch, ...updates } : ch));
    
    // Also update the selected chapter if it matches
    if (selectedChapter?.id === chapterId) {
      setSelectedChapter(prev => prev ? { ...prev, ...updates } : null);
    }

    // If this includes content updates (originalText/processedText), save to database
    if (updates.originalText !== undefined || updates.processedText !== undefined) {
      saveChapterContent(chapterId, updates);
    }
    
    // If this includes title changes, save to database immediately with debouncing
    if (updates.title !== undefined) {
      debouncedSaveChapterTitle(chapterId, updates.title);
    }
    
    setIsInitialLoad(false);
    toast({
      title: "Chapter Updated",
      description: "Chapter has been updated successfully."
    });
  };

  // Debounced save for chapter title changes
  const debouncedSaveChapterTitle = useCallback(
    debounce(async (chapterId: string, title: string) => {
      if (!currentProjectId || currentProjectId.startsWith('project-')) return;

      try {
        const { error } = await supabase
          .from('chapters')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', chapterId);

        if (error) {
          console.error('Error saving chapter title:', error);
          toast({
            title: "Save Error",
            description: "Failed to save chapter title to database",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error saving chapter title:', error);
      }
    }, 1000),
    [currentProjectId]
  );

  const saveChapterContent = async (chapterId: string, updates: { originalText?: string; processedText?: string }) => {
    if (!currentProjectId || currentProjectId.startsWith('project-')) return;

    try {
      const updateData: any = {};
      if (updates.originalText !== undefined) updateData.original_text = updates.originalText;
      if (updates.processedText !== undefined) updateData.processed_text = updates.processedText;
      
      if (Object.keys(updateData).length === 0) return;

      const { error } = await supabase
        .from('chapters')
        .update(updateData)
        .eq('id', chapterId);

      if (error) {
        console.error('Error saving chapter content:', error);
        toast({
          title: "Save Error",
          description: "Failed to save chapter content to database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving chapter content:', error);
    }
  };
  const handleEpisodeUpdate = async (episodeId: string, updates: Partial<Episode>) => {
    // Immediately save episode to database if we have a current project
    if (currentProjectId && !currentProjectId.startsWith('project-')) {
      try {
        const {
          error
        } = await supabase.from('episodes').update({
          title: updates.title,
          description: updates.description,
          updated_at: new Date().toISOString()
        }).eq('id', episodeId);
        if (error) {
          console.error('Error updating episode:', error);
          toast({
            title: "Error",
            description: "Failed to update episode in database",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Error updating episode:', error);
        toast({
          title: "Error",
          description: "Failed to update episode in database",
          variant: "destructive"
        });
        return;
      }
    }
    setEpisodes(prev => prev.map(ep => ep.id === episodeId ? {
      ...ep,
      ...updates
    } : ep));
    toast({
      title: "Episode Updated",
      description: "Episode has been updated successfully."
    });
  };
  const handleEpisodeMerge = async (mergedEpisodes: Episode[]) => {
    // Remove manual database updates - rely on automatic saveEpisodesToSupabase
    setEpisodes(mergedEpisodes);
    setIsInitialLoad(false); // Ensure database save is triggered
    toast({
      title: "Episodes Reordered",
      description: "Episode order has been updated successfully."
    });
  };
  const handleChapterCreate = async (chapterData: any, position?: {
    type: 'beginning' | 'end' | 'after';
    afterChapterId?: string;
  }) => {
    if (!currentProjectId || !user) {
      toast({
        title: "Error",
        description: "No project selected or user not authenticated.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate chapter_order based on position
      let chapterOrder = 1;
      if (position?.type === 'beginning') {
        chapterOrder = 1;
        // Increment existing chapters' order
        const existingChapters = chapters.filter(ch => !ch.episodeId || ch.episodeId === chapterData.episodeId);
        for (const existingChapter of existingChapters) {
          await supabase
            .from('chapters')
            .update({ chapter_order: (existingChapter.chapter_order || 0) + 1 })
            .eq('id', existingChapter.id);
        }
      } else if (position?.type === 'after' && position.afterChapterId) {
        const afterChapter = chapters.find(ch => ch.id === position.afterChapterId);
        chapterOrder = (afterChapter?.chapter_order || 0) + 1;
        // Increment chapters that come after this position
        const chaptersToShift = chapters.filter(ch => 
          (!ch.episodeId || ch.episodeId === chapterData.episodeId) && 
          (ch.chapter_order || 0) >= chapterOrder
        );
        for (const chapterToShift of chaptersToShift) {
          await supabase
            .from('chapters')
            .update({ chapter_order: (chapterToShift.chapter_order || 0) + 1 })
            .eq('id', chapterToShift.id);
        }
      } else {
        // Default: add at end
        const existingChapters = chapters.filter(ch => !ch.episodeId || ch.episodeId === chapterData.episodeId);
        const maxOrder = Math.max(0, ...existingChapters.map(ch => ch.chapter_order || 0));
        chapterOrder = maxOrder + 1;
      }

      // Insert new chapter into database
      const { data: insertedChapter, error } = await supabase
        .from('chapters')
        .insert({
          id: chapterData.id,
          project_id: currentProjectId,
          episode_id: chapterData.episodeId || null,
          title: chapterData.title,
          original_text: chapterData.originalText || '',
          processed_text: chapterData.processedText || null,
          type: chapterData.type || 'chapter',
          content_type: chapterData.contentType || 'novel',
          chapter_order: chapterOrder
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting chapter:', error);
        throw error;
      }

      // Create chapter metadata for local state
      const chapter: ChapterMetadata = {
        id: insertedChapter.id,
        title: insertedChapter.title,
        type: insertedChapter.type as 'chapter' | 'scene',
        contentType: insertedChapter.content_type as 'novel' | 'screenplay',
        episodeId: insertedChapter.episode_id || undefined,
        character_count: insertedChapter.character_count,
        processing_count: insertedChapter.processing_count || 0,
        chapter_order: insertedChapter.chapter_order
      };
      
      // Update local state
      let newChapters = [...chapters];
      if (position?.type === 'beginning') {
        newChapters.unshift(chapter);
      } else if (position?.type === 'after' && position.afterChapterId) {
        const afterIndex = newChapters.findIndex(ch => ch.id === position.afterChapterId);
        if (afterIndex !== -1) {
          newChapters.splice(afterIndex + 1, 0, chapter);
        } else {
          newChapters.push(chapter);
        }
      } else {
        newChapters.push(chapter);
      }
      setChapters(newChapters);

      toast({
        title: "Chapter Created",
        description: `"${chapter.title}" has been added to your project.`
      });
    } catch (error) {
      console.error('Error creating chapter:', error);
      toast({
        title: "Error Creating Chapter",
        description: "Failed to create chapter. Please try again.",
        variant: "destructive"
      });
    }
  };
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);
  const handleProjectCreate = async (projectData: {
    title: string;
    description: string;
    type: 'novel' | 'screenplay' | 'series';
  }, fileData?: any) => {
    // Increment refresh trigger to update project dropdown
    setProjectRefreshTrigger(prev => prev + 1);
  };
  const handleViewToggle = (view: ViewType) => {
    setSelectedViews(prev => {
      let newViews;
      if (prev.includes(view)) {
        // Don't allow removing the last view
        if (prev.length === 1) return prev;
        newViews = prev.filter(v => v !== view);
      } else {
        newViews = [...prev, view];
      }
      localStorage.setItem('selectedViews', JSON.stringify(newViews));
      return newViews;
    });
  };

  const handleStoryboardToggle = (enabled: boolean) => {
    setStoryboardMode(enabled);
    localStorage.setItem('storyboardMode', JSON.stringify(enabled));
  };

  const handleProjectCreateComplete = async (projectId: string, fileImportData?: {parsedContent: any, initialMedium: 'novel' | 'screenplay', outputMedium: string, fileName: string}) => {
    console.log('Project created, selecting:', projectId);
    handleProjectSelect(projectId);
    setShowProjectCreation(false);
    
    // If file import data was provided, import the file into the new project
    if (fileImportData) {
      console.log('Processing file import for new project:', projectId);
      await handleFileImport(
        fileImportData.parsedContent,
        fileImportData.initialMedium,
        fileImportData.outputMedium,
        fileImportData.fileName,
        false, // Not creating new project anymore
        projectId // Target project ID
      );
    }
  };
  return <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">NarraForm</h1>
                <ProjectDropdown onProjectSelect={(projectId, fileImportData) => {
                  console.log('Project selected from dropdown:', projectId);
                  if (fileImportData) {
                    handleProjectCreateComplete(projectId, fileImportData);
                  } else {
                    handleProjectSelect(projectId);
                  }
                }} onCreateProject={() => setShowProjectCreation(true)} currentProjectId={currentProjectId} user={user} refreshTrigger={projectRefreshTrigger} />
              </div>
            </div>
            
            <div className="flex items-center justify-between flex-1">
              {/* Project-specific buttons in center */}
              <div className="flex items-center gap-2 ml-4">
                {currentProjectId && <>
                    <CollaboratorManager projectId={currentProjectId} isOwner={true} />
                    
                    <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                    
                    <ExportManager 
                      episodes={episodes.map(ep => ({
                        ...ep,
                        chapters: chapters.filter(ch => ep.chapterIds.includes(ch.id)).map(ch => ({
                          id: ch.id,
                          title: ch.title,
                          processed_text: ch.processedText || '',
                          original_text: '',
                          type: ch.type
                        }))
                      }))}
                      unassignedChapters={chapters.filter(ch => !episodes.some(ep => ep.chapterIds.includes(ch.id))).map(ch => ({
                        id: ch.id,
                        title: ch.title,
                        processed_text: ch.processedText || '',
                        original_text: '',
                        type: ch.type
                      }))}
                      projectTitle={projects.find(p => p.id === currentProjectId)?.title || localProjects.find(p => p.id === currentProjectId)?.title || 'Project'}
                      outputMedium={projects.find(p => p.id === currentProjectId)?.output_medium}
                    />
                  </>}
              </div>
              
              {/* Settings and theme toggle at far right */}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <SettingsDialog user={user} />
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Layout - Flex container for sidebar and content */}
        <div className="flex flex-1 w-full h-full">
          {currentProjectId && <div className="overflow-hidden">
            <ProjectSidebar 
              chapters={chapters} 
              episodes={episodes} 
              selectedChapter={selectedChapter} 
              onChapterSelect={(chapter) => handleChapterSelect(chapter.id)} 
              onChaptersUpdate={handleChaptersChange} 
              onEpisodesUpdate={setEpisodes} 
              onChapterCreate={handleChapterCreate} 
              onEpisodeCreate={handleCreateEpisode} 
              onChapterMerge={handleChapterMerge}
              projectType={(() => {
                const project = selectedProject ? projects.find(p => p.id === selectedProject) || localProjects.find(p => p.id === selectedProject) : null;
                if (project) {
                  return 'title' in project ? project.content_type as 'novel' | 'screenplay' | 'series' : project.type;
                }
                return 'novel';
              })()} 
              projectId={currentProjectId} 
              user={user}
              onOpenProjectManager={() => setShowProjectCreation(true)}
            />
            </div>}
          
          <main className="flex-1 bg-writer-bg min-w-0 overflow-hidden">
            {selectedChapter ? (
              <EditorView 
                chapter={selectedChapter} 
                selectedViews={selectedViews} 
                onViewToggle={handleViewToggle}
                storyboardMode={storyboardMode}
                onStoryboardToggle={handleStoryboardToggle}
                onTextUpdate={updatedChapter => {
                  setChapters(prev => prev.map(c => c.id === updatedChapter.id ? {
                    ...c,
                    title: updatedChapter.title,
                    type: updatedChapter.type,
                    contentType: updatedChapter.contentType,
                    originalText: updatedChapter.originalText,
                    processedText: updatedChapter.processedText
                  } : c));
                  setSelectedChapter(updatedChapter);
                  // Clear cache for this chapter to ensure fresh data
                  clearCache(updatedChapter.id);
                }}
                projectId={currentProjectId} 
                isProjectOwner={true}
                isLoadingContent={isLoadingChapterContent}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">Welcome to NarraForm</h2>
                  <p className="text-muted-foreground mb-6">
                    Input your API keys in the user settings (gear in the top right) then create a project. If that's all done, select a chapter from the sidebar and get to work. Verify that it imported properly. Edit it as needed, process it, then when you're ready, export to your desired file format. 
                  </p>
                  {currentProjectId ? (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowImportDialog(true)} variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import from File
                  </Button>
                  <Button onClick={resetChapterOrder} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reset Chapter Order
                  </Button>
                </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Use the "Select Project" button above to get started.
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Import Dialog */}
        <FileImportDialog 
          open={showImportDialog} 
          onOpenChange={setShowImportDialog} 
          onImport={handleFileImport} 
          hasCurrentProject={!!currentProjectId} 
        />

        {/* Project Management Dialog */}
        <ManageProjectsDialog 
          open={showProjectCreation} 
          onOpenChange={setShowProjectCreation} 
          onChapterCreate={handleChapterCreate} 
          onEpisodeCreate={handleCreateEpisode} 
          onEpisodeUpdate={handleEpisodeUpdate} 
          onEpisodeMerge={handleEpisodeMerge} 
          onChapterMerge={handleChapterMerge} 
          onChapterReorder={handleChapterReorder}
          onChapterDelete={handleChapterDelete}
          onChapterUpdate={handleChapterUpdate} 
          onProjectCreate={handleProjectCreate} 
          chapters={chapters.map(ch => ({ ...ch, originalText: '', processedText: '' }))}
          episodes={episodes}
          projectType={(() => {
            const project = currentProjectId ? projects.find(p => p.id === currentProjectId) || localProjects.find(p => p.id === currentProjectId) : null;
            if (project) {
              return 'title' in project ? project.content_type as 'novel' | 'screenplay' | 'series' : project.type;
            }
            return 'novel';
          })()} 
          user={user} 
          currentProjectId={currentProjectId} 
          onProjectSelect={handleProjectSelect}
          onDragStateChange={setDragActiveWithTimeout}
        />
      </div>
    </SidebarProvider>
};