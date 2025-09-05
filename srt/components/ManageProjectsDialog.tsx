import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Film, Plus, FolderPlus, Merge, Settings, ChevronRight, ChevronDown, Folder, Play, X, Trash2, GripVertical, BookOpen, Radio, Mic } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SortableChapterItem } from './SortableChapterItem';
import { SortableEpisodeItem } from './SortableEpisodeItem';
import { EpisodeDropZone } from './EpisodeDropZone';
import { UnassignedDropZone } from './UnassignedDropZone';
import { InterEpisodeDropZone } from './InterEpisodeDropZone';
import { EpisodeSeparator } from './EpisodeSeparator';
import { PromptManager } from './PromptManager';
import { ProjectCreationDialog } from './ProjectCreationDialog';

interface Chapter {
  id: string;
  title: string;
  originalText: string;
  processedText?: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
  chapter_order?: number; // Sequential position for all chapters (simplified positioning)
  character_count?: number;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  chapterIds: string[];
}

interface Project {
  id: string;
  title: string;
  description?: string;
  content_type: string;
}

interface ManageProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChapterCreate: (chapter: Chapter, position?: { type: 'beginning' | 'end' | 'after', afterChapterId?: string }) => void;
  onEpisodeCreate: (episode: Episode) => void;
  onEpisodeUpdate?: (episodeId: string, updates: Partial<Episode>) => void;
  onEpisodeMerge?: (mergedEpisodes: Episode[]) => void;
  onChapterMerge: (mergedChapters: Chapter[]) => void;
  onChapterReorder: (reorderedChapters: Chapter[]) => void;
  onChapterDelete?: (chapterIds: string[]) => void;
  onChapterUpdate?: (chapterId: string, updates: Partial<Chapter>) => void;
  onProjectCreate?: (projectData: { title: string; description: string; type: 'novel' | 'screenplay' | 'series' }, fileData?: any) => void;
  chapters: Chapter[];
  episodes: Episode[];
  projectType: 'novel' | 'screenplay' | 'series';
  user?: any;
  currentProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function ManageProjectsDialog({ 
  open, 
  onOpenChange, 
  onChapterCreate,
  onEpisodeCreate,
  onEpisodeUpdate,
  onEpisodeMerge,
  onChapterMerge,
  onChapterReorder,
  onChapterDelete,
  onChapterUpdate,
  onProjectCreate,
  chapters,
  episodes,
  projectType,
  user,
  currentProjectId,
  onProjectSelect,
  onDragStateChange
}: ManageProjectsDialogProps) {
  const { toast } = useToast();
  
  // State management
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '');
  
  // Orphaned chapters management state
  const [showOrphanedSection, setShowOrphanedSection] = useState(false);
  const [selectedOrphanIds, setSelectedOrphanIds] = useState<string[]>([]);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  
  // Project creation state  
  const [showProjectCreationDialog, setShowProjectCreationDialog] = useState(false);
  
  // Form inputs for actions
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionContent, setActionContent] = useState('');
  const [chapterType, setChapterType] = useState<'chapter' | 'scene'>('chapter');
  
  // Delete project state
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Prompt Manager state
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string>('');
  
  // Chapter editing state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [editingEpisodeTitle, setEditingEpisodeTitle] = useState('');
  const [chaptersToDelete, setChaptersToDelete] = useState<string[]>([]);
  const [episodesToDelete, setEpisodesToDelete] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Load projects on open
  useEffect(() => {
    if (open && user) {
      loadProjects();
    }
  }, [open, user]);

  // Update selected project when prop changes
  useEffect(() => {
    setSelectedProjectId(currentProjectId || '');
  }, [currentProjectId]);

  // Track if this is the initial dialog open to prevent auto-expansion on data updates
  const isInitialDialogOpen = useRef(true);

  // Auto-expand episodes that have chapters when dialog opens (initial open only)
  useEffect(() => {
    console.log('ManageProjectsDialog: Dialog opened, current data:', {
      chapters: chapters.length,
      episodes: episodes.length,
      selectedProjectId,
      currentProjectId,
      isInitialOpen: isInitialDialogOpen.current
    });
    if (open && isInitialDialogOpen.current) {
      const shouldExpand = new Set<string>();
      episodes.forEach(episode => {
        const episodeChapters = chapters.filter(ch => ch.episodeId === episode.id);
        if (episodeChapters.length > 0) {
          shouldExpand.add(episode.id);
          console.log(`ManageProjectsDialog: Auto-expanding episode "${episode.title}" (${episodeChapters.length} chapters)`);
        }
      });
      
      console.log('=== MANAGE PROJECTS DIALOG DEBUG ===');
      console.log('Total episodes:', episodes.length);
      console.log('Total chapters:', chapters.length);
      console.log('Episodes with chapters:', episodes.filter(ep => chapters.some(ch => ch.episodeId === ep.id)).length);
      console.log('Unassigned chapters:', chapters.filter(ch => !ch.episodeId).length);
      console.log('Auto-expanding episodes:', Array.from(shouldExpand));
      console.log('=== END DEBUG ===');
      
      setExpandedEpisodes(shouldExpand);
      isInitialDialogOpen.current = false;
    } else if (!open) {
      // Reset for next dialog open
      isInitialDialogOpen.current = true;
    }
  }, [open, episodes, chapters]);

  // Helper functions for expand/collapse all
  const expandAllEpisodes = () => {
    const allEpisodeIds = new Set(episodes.map(ep => ep.id));
    setExpandedEpisodes(allEpisodeIds);
  };

  const collapseAllEpisodes = () => {
    setExpandedEpisodes(new Set());
  };

  // Drag and drop functionality
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = () => {
    console.log('🚀 Drag operation started');
    setIsDragging(true);
    // Notify parent to pause real-time updates during drag
    if (onDragStateChange) {
      onDragStateChange(true);
    }
  };

  // Helper function to get chapters in order and find insertion points
  const getOrderedChapters = () => {
    return [...chapters].sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0));
  };

  const findInsertionPoint = (targetEpisodeId: string, position: 'before' | 'inside' | 'after') => {
    const orderedChapters = getOrderedChapters();
    
    if (position === 'inside') {
      // Find the last chapter in this episode
      const episodeChapters = orderedChapters.filter(ch => ch.episodeId === targetEpisodeId);
      if (episodeChapters.length === 0) {
        // Episode is empty, find where to insert based on episode order
        const episodeIndex = episodes.findIndex(ep => ep.id === targetEpisodeId);
        if (episodeIndex === 0) {
          // First episode, insert at beginning
          return 1;
        } else {
          // Find the last chapter of the previous episode
          const prevEpisode = episodes[episodeIndex - 1];
          const prevEpisodeChapters = orderedChapters.filter(ch => ch.episodeId === prevEpisode?.id);
          const maxPrevOrder = Math.max(0, ...prevEpisodeChapters.map(ch => ch.chapter_order || 0));
          return maxPrevOrder + 1;
        }
      } else {
        const maxOrder = Math.max(...episodeChapters.map(ch => ch.chapter_order || 0));
        return maxOrder + 1;
      }
    } else if (position === 'before') {
      // Find the first chapter of this episode
      const episodeChapters = orderedChapters.filter(ch => ch.episodeId === targetEpisodeId);
      if (episodeChapters.length === 0) {
        // Episode is empty, insert right before where the episode would start
        const episodeIndex = episodes.findIndex(ep => ep.id === targetEpisodeId);
        if (episodeIndex === 0) {
          return 1;
        } else {
          const prevEpisode = episodes[episodeIndex - 1];
          const prevEpisodeChapters = orderedChapters.filter(ch => ch.episodeId === prevEpisode?.id);
          const maxPrevOrder = Math.max(0, ...prevEpisodeChapters.map(ch => ch.chapter_order || 0));
          return maxPrevOrder + 1;
        }
      } else {
        const minOrder = Math.min(...episodeChapters.map(ch => ch.chapter_order || 0));
        return minOrder;
      }
    } else { // after
      const episodeChapters = orderedChapters.filter(ch => ch.episodeId === targetEpisodeId);
      if (episodeChapters.length === 0) {
        // Episode is empty, insert right after where episode would be
        const episodeIndex = episodes.findIndex(ep => ep.id === targetEpisodeId);
        if (episodeIndex === 0) {
          return 2; // After empty first episode
        } else {
          const prevEpisode = episodes[episodeIndex - 1];
          const prevEpisodeChapters = orderedChapters.filter(ch => ch.episodeId === prevEpisode?.id);
          const maxPrevOrder = Math.max(0, ...prevEpisodeChapters.map(ch => ch.chapter_order || 0));
          return maxPrevOrder + 2;
        }
      } else {
        const maxOrder = Math.max(...episodeChapters.map(ch => ch.chapter_order || 0));
        return maxOrder + 1;
      }
    }
  };

  const saveChapterChangesToDatabase = async (chaptersToUpdate: Chapter[]): Promise<boolean> => {
    // Don't save if it's a local project
    if (!currentProjectId || currentProjectId.startsWith('project-')) {
      console.log('Skipping database save for local project');
      return true;
    }

    try {
      console.log('💾 Saving chapters to database:', chaptersToUpdate.length, 'chapters');
      
      // Update each chapter individually
      for (const chapter of chaptersToUpdate) {
        console.log(`Updating chapter ${chapter.id}: order=${chapter.chapter_order}, episodeId=${chapter.episodeId}`);
        
        const { error } = await supabase
          .from('chapters')
          .update({
            chapter_order: chapter.chapter_order || 0,
            episode_id: chapter.episodeId || null
          })
          .eq('id', chapter.id);

        if (error) {
          console.error(`Failed to update chapter ${chapter.id}:`, error);
          throw error;
        }
      }
      
      console.log('✅ Successfully saved all chapter changes to database');
      return true;
    } catch (error) {
      console.error('❌ Failed to save chapter changes:', error);
      toast({
        title: "Save Failed", 
        description: "Failed to save chapter changes. Changes have been reverted.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🏁 Drag operation ending');
    
    const { active, over } = event;

    // Always end drag state, even if operation fails
    const endDragState = () => {
      setIsDragging(false);
      if (onDragStateChange) {
        onDragStateChange(false);
      }
    };

    if (!over || active.id === over.id) {
      endDragState();
      return;
    }

    console.log('🎯 Valid drag operation:', { activeId: active.id, overId: over.id });

    // Store original state for potential rollback
    const originalChapters = [...chapters];

    try {
      // Check if we're dragging an episode
      const activeEpisode = episodes.find(ep => ep.id === active.id);
      if (activeEpisode) {
        const overEpisode = episodes.find(ep => ep.id === over.id);
        if (overEpisode) {
          const oldIndex = episodes.findIndex(ep => ep.id === active.id);
          const newIndex = episodes.findIndex(ep => ep.id === over.id);
          
          if (oldIndex !== newIndex) {
            const reorderedEpisodes = arrayMove(episodes, oldIndex, newIndex);
            if (onEpisodeMerge) {
              onEpisodeMerge(reorderedEpisodes);
            }
          }
        }
        endDragState();
        return;
      }

      const activeChapter = chapters.find(ch => ch.id === active.id);
      if (!activeChapter) {
        endDragState();
        return;
      }

      console.log('📚 Moving chapter:', activeChapter.title, 'from order:', activeChapter.chapter_order);

      let newChapters: Chapter[] = [];
      
      // Simplified approach: Create new sequential ordering
      const createSequentialOrdering = () => {
        // Get all chapters except the one being moved
        const otherChapters = chapters.filter(ch => ch.id !== activeChapter.id);
        
        // Find insertion position and episode
        let insertIndex = 0;
        let newEpisodeId: string | undefined = undefined;
        
        if (typeof over.id === 'string') {
          // Handle drop zones
          if (over.id === 'unassigned-area') {
            newEpisodeId = undefined;
            insertIndex = otherChapters.filter(ch => !ch.episodeId).length;
          } else if (over.id.startsWith('episode-header-')) {
            newEpisodeId = over.id.replace('episode-header-', '');
            insertIndex = otherChapters.filter(ch => ch.episodeId === newEpisodeId).length;
          } else if (over.id === 'before-first-episode') {
            newEpisodeId = undefined;
            insertIndex = 0;
          } else if (over.id === 'after-last-episode') {
            newEpisodeId = undefined;
            insertIndex = otherChapters.filter(ch => !ch.episodeId).length;
          } else if (over.id.startsWith('between-episodes-')) {
            newEpisodeId = undefined;
            insertIndex = 0; // Insert at beginning of inter-episode space
          }
        } else {
          // Dropping on another chapter
          const targetChapter = chapters.find(ch => ch.id === over.id);
          if (targetChapter) {
            newEpisodeId = targetChapter.episodeId;
            const sameEpisodeChapters = otherChapters.filter(ch => ch.episodeId === newEpisodeId);
            insertIndex = sameEpisodeChapters.findIndex(ch => ch.id === targetChapter.id);
            if (insertIndex === -1) insertIndex = sameEpisodeChapters.length;
          }
        }

        // Create updated chapter
        const updatedChapter = {
          ...activeChapter,
          episodeId: newEpisodeId,
          chapter_order: 0 // Will be recalculated
        };

        // Build new chapters array with proper ordering
        const unassignedChapters = otherChapters.filter(ch => !ch.episodeId);
        const episodeChaptersMap = new Map<string, Chapter[]>();
        
        // Group chapters by episode
        otherChapters.filter(ch => ch.episodeId).forEach(ch => {
          if (!episodeChaptersMap.has(ch.episodeId!)) {
            episodeChaptersMap.set(ch.episodeId!, []);
          }
          episodeChaptersMap.get(ch.episodeId!)!.push(ch);
        });

        // Insert the moved chapter in the right place
        if (!newEpisodeId) {
          // Adding to unassigned
          unassignedChapters.splice(insertIndex, 0, updatedChapter);
        } else {
          // Adding to episode
          if (!episodeChaptersMap.has(newEpisodeId)) {
            episodeChaptersMap.set(newEpisodeId, []);
          }
          episodeChaptersMap.get(newEpisodeId)!.splice(insertIndex, 0, updatedChapter);
        }

        // Rebuild with sequential ordering
        const result: Chapter[] = [];
        let orderCounter = 1;

        // Add unassigned chapters first
        unassignedChapters.forEach(ch => {
          result.push({ ...ch, chapter_order: orderCounter++ });
        });

        // Add episode chapters in episode order
        episodes.forEach(episode => {
          const episodeChapters = episodeChaptersMap.get(episode.id) || [];
          episodeChapters.forEach(ch => {
            result.push({ ...ch, chapter_order: orderCounter++ });
          });
        });

        return result;
      };

      newChapters = createSequentialOrdering();
      
      // Find chapters that actually changed
      const changedChapters = newChapters.filter(updated => {
        const original = originalChapters.find(ch => ch.id === updated.id);
        return original && (
          original.chapter_order !== updated.chapter_order || 
          original.episodeId !== updated.episodeId
        );
      });

      console.log('💾 Chapters changed:', changedChapters.length, 'out of', chapters.length);

      if (changedChapters.length > 0) {
        // Apply optimistic update
        console.log('📤 Applying optimistic update');
        onChapterReorder(newChapters);
        
        // Save to database
        const saveSuccess = await saveChapterChangesToDatabase(changedChapters);
        
        if (!saveSuccess) {
          // Rollback on failure
          console.log('🔄 Rolling back due to save failure');
          onChapterReorder(originalChapters);
        }
      }
      
    } catch (error) {
      console.error('❌ Drag operation failed:', error);
      // Rollback on error
      onChapterReorder(originalChapters);
      toast({
        title: "Drag Failed",
        description: "Failed to move chapter. Changes have been reverted.",
        variant: "destructive"
      });
    } finally {
      endDragState();
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

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

  const getIcon = (type: 'chapter' | 'scene') => {
    return type === 'chapter' ? FileText : Film;
  };

  const handleChapterSelect = (chapterId: string, index: number, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click: toggle individual selection
      setSelectedChapterIds(prev => 
        prev.includes(chapterId)
          ? prev.filter(id => id !== chapterId)
          : [...prev, chapterId]
      );
    } else if (event.shiftKey && lastClickedIndex !== null) {
      // Shift+click: select range
      const allChapters = getAllChaptersInOrder();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = allChapters.slice(start, end + 1).map(c => c.id);
      
      setSelectedChapterIds(prev => {
        const newSelected = new Set(prev);
        rangeIds.forEach(id => newSelected.add(id));
        return Array.from(newSelected);
      });
    } else {
      // Regular click: single selection
      setSelectedChapterIds([chapterId]);
    }
    setLastClickedIndex(index);
  };

  const handleEpisodeSelect = (episodeId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click: toggle individual selection
      setSelectedEpisodeIds(prev => 
        prev.includes(episodeId)
          ? prev.filter(id => id !== episodeId)
          : [...prev, episodeId]
      );
    } else {
      // Regular click: single selection
      setSelectedEpisodeIds([episodeId]);
    }
  };

  const getAllChaptersInOrder = () => {
    // Return all chapters sorted by chapter_order
    return [...chapters].sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0));
  };

  // Detect chapters that might be orphaned
  const detectOrphanedChapters = () => {
    const unassignedChapters = chapters.filter(ch => !ch.episodeId && (ch.chapter_order || 0) === 0);
    
    return unassignedChapters.filter(ch => {
      const wordCount = ch.originalText.split(/\s+/).length;
      if (wordCount < 50) return true; // Very short chapters might be orphaned
      
      // Check if similar chapters are assigned to episodes
      const hasSimilarAssigned = chapters.some(assignedCh => 
        assignedCh.id !== ch.id && 
        assignedCh.episodeId &&
        (
          assignedCh.title.toLowerCase().includes(ch.title.toLowerCase()) ||
          ch.title.toLowerCase().includes(assignedCh.title.toLowerCase())
        )
      );
      
      return hasSimilarAssigned;
    });
  };

  // Handle orphaned chapter selection
  const handleOrphanSelect = (chapterId: string) => {
    setSelectedOrphanIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  // Handle bulk deletion of orphaned chapters
  const handleDeleteOrphans = async () => {
    if (selectedOrphanIds.length === 0) return;

    setIsCleaningOrphans(true);
    
    try {
      // Delete from database if not a local project
      if (!selectedProjectId.startsWith('project-')) {
        // First mark chapters as orphaned in database
        const { error: markError } = await supabase
          .from('chapters')
          .update({ is_orphaned: true })
          .in('id', selectedOrphanIds);
        
        if (markError) {
          console.error('Error marking chapters as orphaned:', markError);
        }

        // Then delete them
        const { error: deleteError } = await supabase
          .from('chapters')
          .delete()
          .in('id', selectedOrphanIds);
        
        if (deleteError) {
          console.error('Error deleting orphaned chapters:', deleteError);
          toast({
            title: "Delete Failed",
            description: "Failed to delete orphaned chapters from database.",
            variant: "destructive"
          });
          return;
        }
      }

      // Update local state through the callback if provided
      if (onChapterDelete) {
        onChapterDelete(selectedOrphanIds);
      }
      
      toast({
        title: "Orphaned Chapters Deleted",
        description: `${selectedOrphanIds.length} orphaned chapters have been removed.`
      });
      
      setSelectedOrphanIds([]);
    } catch (error) {
      console.error('Error deleting orphaned chapters:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete orphaned chapters.",
        variant: "destructive"
      });
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  // Handle marking chapters as orphaned/not orphaned
  const handleToggleOrphanStatus = async (chapterIds: string[], isOrphaned: boolean) => {
    try {
      if (!selectedProjectId.startsWith('project-')) {
        const { error } = await supabase
          .from('chapters')
          .update({ is_orphaned: isOrphaned })
          .in('id', chapterIds);
        
        if (error) {
          console.error('Error updating orphan status:', error);
          toast({
            title: "Update Failed",
            description: "Failed to update chapter orphan status.",
            variant: "destructive"
          });
          return;
        }
      }

      // Update local state if callback is provided
      // Skip local state update since we're using simplified model
      console.log('Chapter marking completed');

      toast({
        title: isOrphaned ? "Marked as Orphaned" : "Unmarked as Orphaned",
        description: `${chapterIds.length} chapters updated.`
      });
    } catch (error) {
      console.error('Error toggling orphan status:', error);
      toast({
        title: "Update Failed", 
        description: "Failed to update orphan status.",
        variant: "destructive"
      });
    }
  };

  const orphanedChapters = detectOrphanedChapters();

  const getActionButton = () => {
    const selectedCount = selectedChapterIds.length;
    
    if (selectedCount === 0) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-chapter-title">New Chapter Title</Label>
            <Input
              id="new-chapter-title"
              placeholder="Enter chapter title..."
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-chapter-type">Type</Label>
            <Select value={chapterType} onValueChange={(value: 'chapter' | 'scene') => setChapterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                <SelectItem value="chapter">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Chapter
                  </div>
                </SelectItem>
                <SelectItem value="scene">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Scene
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-chapter-content">Content</Label>
            <Textarea
              id="new-chapter-content"
              placeholder="Enter chapter content..."
              value={actionContent}
              onChange={(e) => setActionContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <Button onClick={handleAddChapter} disabled={!actionTitle.trim() || !actionContent.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chapter
          </Button>
        </div>
      );
    }
    
    if (selectedCount === 1) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-chapter-title">New Chapter Title</Label>
            <Input
              id="new-chapter-title"
              placeholder="Enter chapter title..."
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-chapter-type">Type</Label>
            <Select value={chapterType} onValueChange={(value: 'chapter' | 'scene') => setChapterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                <SelectItem value="chapter">Chapter</SelectItem>
                <SelectItem value="scene">Scene</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-chapter-content">Content</Label>
            <Textarea
              id="new-chapter-content"
              placeholder="Enter chapter content..."
              value={actionContent}
              onChange={(e) => setActionContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddChapterAfter} disabled={!actionTitle.trim() || !actionContent.trim()} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter After Selected
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setChaptersToDelete(selectedChapterIds)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      );
    }
    
    if (selectedCount === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merge-title">Merged Chapter Title</Label>
            <Input
              id="merge-title"
              placeholder="Enter title for merged chapter..."
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleMergeChapters} disabled={!actionTitle.trim()} className="flex-1">
              <Merge className="h-4 w-4 mr-2" />
              Merge Chapters
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setChaptersToDelete(selectedChapterIds)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="episode-title-2">Episode Title</Label>
            <Input
              id="episode-title-2"
              placeholder="Enter episode title..."
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateEpisode} disabled={!actionDescription.trim()}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Episode
          </Button>
        </div>
      );
    }
    
    // selectedCount >= 3
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="episode-title">Episode Title</Label>
          <Input
            id="episode-title"
            placeholder="Enter episode title..."
            value={actionTitle}
            onChange={(e) => setActionTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="episode-description">Description (Optional)</Label>
          <Input
            id="episode-description"
            placeholder="Enter episode description..."
            value={actionDescription}
            onChange={(e) => setActionDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateEpisode} disabled={!actionTitle.trim()} className="flex-1">
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Episode
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setChaptersToDelete(selectedChapterIds)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    );
  };

  const handleAddChapter = () => {
    if (!actionTitle.trim() || !actionContent.trim()) return;
    
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: actionTitle.trim(),
      originalText: actionContent.trim(),
      type: chapterType,
      contentType: projectType === 'series' ? 'novel' : projectType,
    };
    
    onChapterCreate(newChapter, { type: 'end' });
    resetForm();
  };

  const handleAddChapterAfter = () => {
    if (!actionTitle.trim() || !actionContent.trim() || selectedChapterIds.length !== 1) return;
    
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: actionTitle.trim(),
      originalText: actionContent.trim(),
      type: chapterType,
      contentType: projectType === 'series' ? 'novel' : projectType,
    };
    
    onChapterCreate(newChapter, { type: 'after', afterChapterId: selectedChapterIds[0] });
    resetForm();
  };

  const handleMergeChapters = () => {
    if (selectedChapterIds.length !== 2 || !actionTitle.trim()) return;
    
    const chaptersToMerge = chapters.filter(ch => selectedChapterIds.includes(ch.id));
    const remainingChapters = chapters.filter(ch => !selectedChapterIds.includes(ch.id));
    
    const mergedContent = chaptersToMerge.map(ch => ch.originalText).join('\n\n');
    const mergedChapter: Chapter = {
      id: crypto.randomUUID(),
      title: actionTitle.trim(),
      originalText: mergedContent,
      type: chaptersToMerge[0].type,
      contentType: chaptersToMerge[0].contentType,
      episodeId: chaptersToMerge[0].episodeId
    };

    const firstSelectedIndex = chapters.findIndex(ch => ch.id === selectedChapterIds[0]);
    const newChapters = [...chapters];
    
    // Remove selected chapters
    selectedChapterIds.forEach(id => {
      const index = newChapters.findIndex(ch => ch.id === id);
      if (index !== -1) {
        newChapters.splice(index, 1);
      }
    });
    
    // Insert merged chapter
    const insertIndex = Math.min(firstSelectedIndex, newChapters.length);
    newChapters.splice(insertIndex, 0, mergedChapter);

    onChapterMerge(newChapters);
    resetForm();
  };

  const handleCreateEpisode = () => {
    if (selectedChapterIds.length < 2) return;
    
    // Use actionDescription for episode title when we have 2 chapters
    const title = selectedChapterIds.length === 2 ? actionDescription.trim() : actionTitle.trim();
    if (!title) return;
    
    const newEpisode: Episode = {
      id: crypto.randomUUID(),
      title,
      description: selectedChapterIds.length === 2 ? undefined : actionDescription.trim() || undefined,
      chapterIds: selectedChapterIds
    };

    onEpisodeCreate(newEpisode);
    resetForm();
  };

  const handleDeleteChapters = () => {
    if (!onChapterDelete || chaptersToDelete.length === 0) return;
    onChapterDelete(chaptersToDelete);
    setChaptersToDelete([]);
    setSelectedChapterIds([]);
    resetForm();
  };

  const handleDeleteEpisodes = async () => {
    if (episodesToDelete.length === 0) return;

    try {
      // Delete from database if not a local project
      if (!selectedProjectId.startsWith('project-')) {
        // First, unassign chapters from episodes to be deleted
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ episode_id: null })
          .in('episode_id', episodesToDelete);

        if (updateError) throw updateError;

        // Then delete the episodes
        const { error: deleteError } = await supabase
          .from('episodes')
          .delete()
          .in('id', episodesToDelete);

        if (deleteError) throw deleteError;
      }

      // Update local state - unassign chapters from deleted episodes
      const updatedChapters = chapters.map(chapter => 
        episodesToDelete.includes(chapter.episodeId || '') 
          ? { ...chapter, episodeId: undefined }
          : chapter
      );
      onChapterMerge(updatedChapters);

      // Remove episodes from local state
      const updatedEpisodes = episodes.filter(ep => !episodesToDelete.includes(ep.id));
      onEpisodeMerge?.(updatedEpisodes);

      toast({
        title: "Episodes Deleted",
        description: `${episodesToDelete.length === 1 ? 'Episode' : 'Episodes'} deleted successfully. Chapters have been unassigned.`,
      });

      // Clear selection and reset
      setSelectedEpisodeIds(prev => prev.filter(id => !episodesToDelete.includes(id)));
      setEpisodesToDelete([]);
    } catch (error) {
      console.error('Error deleting episodes:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete episodes. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleChapterDoubleClick = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditingTitle(chapter.title);
  };

  const handleTitleSave = () => {
    if (!onChapterUpdate || !editingChapterId || !editingTitle.trim()) return;
    
    onChapterUpdate(editingChapterId, { title: editingTitle.trim() });
    setEditingChapterId(null);
    setEditingTitle('');
  };

  const handleTitleCancel = () => {
    setEditingChapterId(null);
    setEditingTitle('');
  };

  const handleEpisodeDoubleClick = (episode: Episode) => {
    setEditingEpisodeId(episode.id);
    setEditingEpisodeTitle(episode.title);
  };

  const handleEpisodeTitleSave = () => {
    if (!onEpisodeUpdate || !editingEpisodeId || !editingEpisodeTitle.trim()) return;
    
    onEpisodeUpdate(editingEpisodeId, { title: editingEpisodeTitle.trim() });
    setEditingEpisodeId(null);
    setEditingEpisodeTitle('');
  };

  const handleEpisodeTitleCancel = () => {
    setEditingEpisodeId(null);
    setEditingEpisodeTitle('');
  };

  const handleEpisodeTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEpisodeTitleSave();
    } else if (e.key === 'Escape') {
      handleEpisodeTitleCancel();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleProjectSelect = (projectId: string) => {
    console.log('ManageProjectsDialog: handleProjectSelect called with:', projectId);
    setSelectedProjectId(projectId);
    if (onProjectSelect) {
      console.log('ManageProjectsDialog: Calling onProjectSelect callback');
      onProjectSelect(projectId);
    } else {
      console.log('ManageProjectsDialog: No onProjectSelect callback provided');
    }
  };


  const resetForm = () => {
    setActionTitle('');
    setActionDescription('');
    setActionContent('');
    setSelectedChapterIds([]);
    setLastClickedIndex(null);
  };

  const handleProjectCreated = async (projectId: string, fileImportData?: {parsedContent: any, initialMedium?: 'novel' | 'screenplay', outputMedium?: string, originalLanguage?: string, outputLanguage?: string, fileName: string, purpose: string}) => {
    // Refresh projects list  
    loadProjects();
    // Select the new project
    setSelectedProjectId(projectId);
    if (onProjectSelect) {
      onProjectSelect(projectId);
    }
    
    // Handle file import if provided
    if (fileImportData && fileImportData.parsedContent && fileImportData.parsedContent.sections) {
      try {
        // Create chapters from the parsed content
        const chapterPromises = fileImportData.parsedContent.sections.map(async (section: any, index: number) => {
          // Clean up the section title - remove extra formatting and whitespace
          const cleanTitle = section.title ? 
            section.title.replace(/^(Chapter\s+\d+\s*[:\-\s]*\s*)/i, '').trim() || `Chapter ${index + 1}` :
            `Chapter ${index + 1}`;
          
          const chapterData = {
            title: cleanTitle,
            original_text: section.content || '',
            type: section.type || 'chapter',
            content_type: fileImportData.initialMedium || 'novel',
            project_id: projectId,
            chapter_order: index + 1
          };

          // Insert chapter into database
          const { data, error } = await supabase
            .from('chapters')
            .insert(chapterData)
            .select('*')
            .single();

          if (error) {
            console.error('Error creating chapter:', error);
            throw error;
          }

          return {
            id: data.id,
            title: data.title,
            originalText: data.original_text,
            processedText: data.processed_text,
            type: data.type as 'chapter' | 'scene',
            contentType: data.content_type as 'novel' | 'screenplay'
          };
        });

        const createdChapters = await Promise.all(chapterPromises);
        
        toast({
          title: "Project Created with Content",
          description: `${createdChapters.length} chapters imported successfully.`
        });
      } catch (error) {
        console.error('Error importing chapters:', error);
        toast({
          title: "Import Warning",
          description: "Project created but some chapters failed to import.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully."
      });
    }
  };

  const handlePromptManagerClose = () => {
    setShowPromptManager(false);
    setCreatedProjectId('');
  };

  const handlePromptSelect = (promptContent: string) => {
    toast({
      title: "Prompt Template Applied",
      description: "Your project is ready to begin processing content."
    });
    setShowPromptManager(false);
    setCreatedProjectId('');
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const confirmDeleteProject = async () => {
    console.log('confirmDeleteProject called - projectToDelete:', projectToDelete);
    
    const currentProjectToDelete = projectToDelete || selectedProjectId;
    
    if (!currentProjectToDelete || !user) {
      console.error('ConfirmDeleteProject: Missing project ID or user authentication');
      toast({
        title: "Error",
        description: "Cannot delete project - missing information or not authenticated",
        variant: "destructive"
      });
      setProjectToDelete(null);
      return;
    }

    try {
      console.log('ConfirmDeleteProject: Deleting project:', currentProjectToDelete);
      
      // IMMEDIATE UI CLEANUP - Clear state first for instant feedback
      setProjects(prev => prev.filter(p => p.id !== currentProjectToDelete));
      
      // Clear all possible localStorage keys for this project
      const keysToRemove = [
        `storyConverter_project_${currentProjectToDelete}`,
        `storyConverter_episodes_${currentProjectToDelete}`,  
        `storyConverter_chapters_${currentProjectToDelete}`,
        `${currentProjectToDelete}-chapters`,
        `${currentProjectToDelete}-episodes`,
        `project-${currentProjectToDelete}`,
        `chapters_${currentProjectToDelete}`,
        `episodes_${currentProjectToDelete}`,
        `audiodrama-projects` // Also clear main project list to refresh
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // If deleted project was selected, immediately clear it
      if (selectedProjectId === currentProjectToDelete) {
        setSelectedProjectId('');
        if (onProjectSelect) {
          onProjectSelect(null); // Pass null to completely clear selection
        }
      }

      // Now delete from database
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', currentProjectToDelete);

      if (error) {
        console.error('ConfirmDeleteProject: Database error:', error);
        // If database delete fails, we need to reload to restore state
        loadProjects();
        throw error;
      }

      console.log('ConfirmDeleteProject: Project deleted successfully');

      toast({
        title: "Project Deleted",
        description: "Project and all associated data have been deleted."
      });

      // Reload projects to ensure fresh data
      loadProjects();

    } catch (error) {
      console.error('ConfirmDeleteProject: Error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col" onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Projects
            </DialogTitle>
            <Button
              variant="outline"
              onClick={() => setShowProjectCreationDialog(true)}
              className="gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Create New Project
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Project Selection & Creation */}
          <div className="w-80 flex flex-col space-y-4 overflow-y-auto pr-2">
            {/* Project Selector */}
            <div className="space-y-2">
              <Label>Current Project</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger className="bg-background text-foreground border-input">
                  <SelectValue placeholder="Select a project..." className="text-foreground" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-popover-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Delete Project Button - only show when project is selected */}
              {selectedProjectId && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    console.log('Delete button clicked - selectedProjectId:', selectedProjectId);
                    console.log('User:', user?.id);
                    setProjectToDelete(selectedProjectId);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              )}
            </div>


            {/* Action Panel */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {selectedChapterIds.length === 0 && "Create New Chapter"}
                {selectedChapterIds.length === 1 && "Add Chapter After Selected"}
                {selectedChapterIds.length === 2 && "Merge Selected Chapters"}
                {selectedChapterIds.length > 2 && "Create Episode from Selected"}
              </Label>
              {getActionButton()}
            </div>
          </div>

          {/* Right Panel - Chapter List */}
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Project Chapters & Episodes</Label>
                {/* Debug info */}
                <div className="text-xs text-muted-foreground">
                  {chapters.length} chapters • {episodes.length} episodes • {chapters.filter(ch => !ch.episodeId).length} unassigned
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Episode deletion button */}
                {selectedEpisodeIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setEpisodesToDelete(selectedEpisodeIds)}
                    className="text-xs gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete {selectedEpisodeIds.length} Episode{selectedEpisodeIds.length > 1 ? 's' : ''}
                  </Button>
                )}
                
                {/* Orphaned chapters toggle */}
                {orphanedChapters.length > 0 && (
                  <Button
                    variant={showOrphanedSection ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOrphanedSection(!showOrphanedSection)}
                    className="text-xs gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Orphaned ({orphanedChapters.length})
                  </Button>
                )}
                
                {/* Expand/Collapse All buttons */}
                {episodes.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={expandAllEpisodes}
                      className="text-xs"
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={collapseAllEpisodes}
                      className="text-xs"
                    >
                      Collapse All
                    </Button>
                  </>
                )}
                {selectedChapterIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedChapterIds([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Selection ({selectedChapterIds.length})
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-y-auto">
              {chapters.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="mb-2">No chapters in this project yet</div>
                  <div className="text-sm">Create your first chapter to get started</div>
                </div>
               ) : (
                 <div className="p-2 space-y-1">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={[...episodes.map(ep => ep.id), ...chapters.map(ch => ch.id)]}
                        strategy={verticalListSortingStrategy}
                      >
                       {/* Episodes with Simplified Separators */}
                        {episodes.map((episode, index) => {
                          const episodeChapters = chapters.filter(ch => ch.episodeId === episode.id);
                          const isExpanded = expandedEpisodes.has(episode.id);
                          
                          // Get inter-episode chapters that appear before this episode by chapter_order
                          const orderedChapters = [...chapters].sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0));
                          
                          // Find chapters that come before this episode in the sequence
                          const firstEpisodeChapterOrder = episodeChapters.length > 0 
                            ? Math.min(...episodeChapters.map(ch => ch.chapter_order || 0))
                            : Infinity;
                          
                          const beforeChapters = orderedChapters.filter(ch => 
                            !ch.episodeId && (ch.chapter_order || 0) < firstEpisodeChapterOrder
                          );

                          // For "before first episode", show all inter-episode chapters that come before the first episode
                          const isFirstEpisode = index === 0;
                          const chaptersToShow = isFirstEpisode 
                            ? beforeChapters 
                            : beforeChapters.filter(ch => {
                                // Show chapters that come after the previous episode but before this one
                                const prevEpisode = episodes[index - 1];
                                const prevEpisodeChapters = chapters.filter(c => c.episodeId === prevEpisode?.id);
                                const maxPrevOrder = prevEpisodeChapters.length > 0 
                                  ? Math.max(...prevEpisodeChapters.map(c => c.chapter_order || 0))
                                  : 0;
                                return (ch.chapter_order || 0) > maxPrevOrder;
                              });

                          const previousEpisode = episodes[index - 1];
                          
                          return (
                            <div key={episode.id}>
                              {/* Separator before this episode */}
                              <EpisodeSeparator
                                dropId={index === 0 ? "before-first-episode" : `between-episodes-${previousEpisode?.id}-${episode.id}`}
                                label={index === 0 ? "Before first episode" : `Between "${previousEpisode?.title}" and "${episode.title}"`}
                                isDragging={isDragging}
                                hasChapters={chaptersToShow.length > 0}
                              >
                                {chaptersToShow.map(chapter => {
                                  const isSelected = selectedChapterIds.includes(chapter.id);
                                  const currentIndex = getAllChaptersInOrder().findIndex(ch => ch.id === chapter.id);
                                  const isEditing = editingChapterId === chapter.id;
                                  
                                  return (
                                    <SortableChapterItem
                                      key={chapter.id}
                                      chapter={chapter}
                                      isSelected={isSelected}
                                      isEditing={isEditing}
                                      editingTitle={editingTitle}
                                      onSelect={(e) => handleChapterSelect(chapter.id, currentIndex, e)}
                                      onDoubleClick={() => handleChapterDoubleClick(chapter)}
                                      onEditingTitleChange={setEditingTitle}
                                      onTitleKeyDown={handleTitleKeyDown}
                                      onTitleSave={handleTitleSave}
                                      onTitleCancel={handleTitleCancel}
                                      isInEpisode={false}
                                    />
                                  );
                                })}
                              </EpisodeSeparator>
                             
                             {/* Episode folder */}
                             <SortableEpisodeItem
                               episode={episode}
                               isExpanded={isExpanded}
                               isEditing={editingEpisodeId === episode.id}
                               editingTitle={editingEpisodeTitle}
                               onToggle={() => toggleEpisode(episode.id)}
                               onDoubleClick={() => handleEpisodeDoubleClick(episode)}
                               onEditingTitleChange={setEditingEpisodeTitle}
                               onTitleKeyDown={handleEpisodeTitleKeyDown}
                               onTitleSave={handleEpisodeTitleSave}
                               onTitleCancel={handleEpisodeTitleCancel}
                               chapterCount={episodeChapters.length}
                               isSelected={selectedEpisodeIds.includes(episode.id)}
                               onSelect={(e) => handleEpisodeSelect(episode.id, e)}
                             >
                               {isExpanded && episodeChapters.map(chapter => {
                                 const isSelected = selectedChapterIds.includes(chapter.id);
                                 const currentIndex = getAllChaptersInOrder().findIndex(ch => ch.id === chapter.id);
                                 const isEditing = editingChapterId === chapter.id;
                                 
                                 return (
                                   <SortableChapterItem
                                     key={chapter.id}
                                     chapter={chapter}
                                     isSelected={isSelected}
                                     isEditing={isEditing}
                                     editingTitle={editingTitle}
                                     onSelect={(e) => handleChapterSelect(chapter.id, currentIndex, e)}
                                     onDoubleClick={() => handleChapterDoubleClick(chapter)}
                                     onEditingTitleChange={setEditingTitle}
                                     onTitleKeyDown={handleTitleKeyDown}
                                     onTitleSave={handleTitleSave}
                                     onTitleCancel={handleTitleCancel}
                                     isInEpisode={true}
                                   />
                                 );
                               })}
                             </SortableEpisodeItem>

                              {/* Separator after the last episode */}
                              {index === episodes.length - 1 && (
                                <EpisodeSeparator
                                  dropId="after-last-episode"
                                  label={`After "${episode.title}"`}
                                  isDragging={isDragging}
                                  hasChapters={(() => {
                                    // Show inter-episode chapters that come after the last episode
                                    const orderedChapters = [...chapters].sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0));
                                    const lastEpisodeChapterOrder = episodeChapters.length > 0 
                                      ? Math.max(...episodeChapters.map(ch => ch.chapter_order || 0))
                                      : 0;
                                    return orderedChapters.filter(ch => 
                                      !ch.episodeId && (ch.chapter_order || 0) > lastEpisodeChapterOrder
                                    ).length > 0;
                                  })()}
                                >
                                  {(() => {
                                    const orderedChapters = [...chapters].sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0));
                                    const lastEpisodeChapterOrder = episodeChapters.length > 0 
                                      ? Math.max(...episodeChapters.map(ch => ch.chapter_order || 0))
                                      : 0;
                                    return orderedChapters.filter(ch => 
                                      !ch.episodeId && (ch.chapter_order || 0) > lastEpisodeChapterOrder
                                    );
                                  })().map(chapter => {
                                    const isSelected = selectedChapterIds.includes(chapter.id);
                                    const currentIndex = getAllChaptersInOrder().findIndex(ch => ch.id === chapter.id);
                                    const isEditing = editingChapterId === chapter.id;
                                    
                                    return (
                                      <SortableChapterItem
                                        key={chapter.id}
                                        chapter={chapter}
                                        isSelected={isSelected}
                                        isEditing={isEditing}
                                        editingTitle={editingTitle}
                                        onSelect={(e) => handleChapterSelect(chapter.id, currentIndex, e)}
                                        onDoubleClick={() => handleChapterDoubleClick(chapter)}
                                        onEditingTitleChange={setEditingTitle}
                                        onTitleKeyDown={handleTitleKeyDown}
                                        onTitleSave={handleTitleSave}
                                        onTitleCancel={handleTitleCancel}
                                        isInEpisode={false}
                                      />
                                    );
                                  })}
                                </EpisodeSeparator>
                              )}
                           </div>
                         );
                       })}
                       
                         {/* Unassigned Chapters Area - Only truly orphaned chapters */}
                         <UnassignedDropZone>
                           {chapters.filter(ch => !ch.episodeId && (ch.chapter_order || 0) === 0).map(chapter => {
                           const isSelected = selectedChapterIds.includes(chapter.id);
                           const currentIndex = getAllChaptersInOrder().findIndex(ch => ch.id === chapter.id);
                           const isEditing = editingChapterId === chapter.id;
                           
                           return (
                             <SortableChapterItem
                               key={chapter.id}
                               chapter={chapter}
                               isSelected={isSelected}
                               isEditing={isEditing}
                               editingTitle={editingTitle}
                               onSelect={(e) => handleChapterSelect(chapter.id, currentIndex, e)}
                               onDoubleClick={() => handleChapterDoubleClick(chapter)}
                                onEditingTitleChange={setEditingTitle}
                                onTitleKeyDown={handleTitleKeyDown}
                                onTitleSave={handleTitleSave}
                                onTitleCancel={handleTitleCancel}
                                isInEpisode={false}
                             />
                           );
                         })}
                        </UnassignedDropZone>
                        
                        {/* Orphaned Chapters Section */}
                        {showOrphanedSection && orphanedChapters.length > 0 && (
                          <div className="mt-4 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <Label className="text-sm font-medium text-destructive">
                                  Orphaned Chapters ({orphanedChapters.length})
                                </Label>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    const allOrphanIds = orphanedChapters.map(ch => ch.id);
                                    setSelectedOrphanIds(
                                      selectedOrphanIds.length === allOrphanIds.length ? [] : allOrphanIds
                                    );
                                  }}
                                >
                                  {selectedOrphanIds.length === orphanedChapters.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                {selectedOrphanIds.length > 0 && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleOrphanStatus(selectedOrphanIds, false)}
                                    >
                                      Restore ({selectedOrphanIds.length})
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={handleDeleteOrphans}
                                      disabled={isCleaningOrphans}
                                    >
                                      {isCleaningOrphans ? 'Deleting...' : `Delete ${selectedOrphanIds.length}`}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {orphanedChapters.map((chapter) => (
                                <div 
                                  key={chapter.id} 
                                  className={cn(
                                    "flex items-start space-x-2 p-3 border rounded cursor-pointer hover:bg-background/50",
                                    selectedOrphanIds.includes(chapter.id) && "bg-primary/10 border-primary"
                                  )}
                                  onClick={() => handleOrphanSelect(chapter.id)}
                                >
                                  <Checkbox
                                    checked={selectedOrphanIds.includes(chapter.id)}
                                    onCheckedChange={() => handleOrphanSelect(chapter.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {chapter.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {chapter.character_count || 0} chars • {chapter.type}
                                      {chapter.processedText && " • Processed"}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate mt-1">
                                      {chapter.originalText?.substring(0, 80)}...
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </SortableContext>
                   </DndContext>
                 </div>
               )}
             </div>
           </div>
         </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Use Ctrl+click or Cmd+click to select multiple chapters for merging, Shift+click for range selection, or drag to organize into episode folders
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Save
            </Button>
          </div>
        </div>

        {/* Delete Project Confirmation Dialog */}
        {projectToDelete && (
          <AlertDialog open={true} onOpenChange={(open) => !open && setProjectToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this project? This action cannot be undone and will permanently delete all project data including chapters and episodes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteProject} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Delete Chapters Confirmation Dialog */}
        {chaptersToDelete.length > 0 && (
          <AlertDialog open={true} onOpenChange={(open) => !open && setChaptersToDelete([])}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Chapters</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {chaptersToDelete.length === 1 ? 'this chapter' : `these ${chaptersToDelete.length} chapters`}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setChaptersToDelete([])}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteChapters} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {chaptersToDelete.length === 1 ? 'Chapter' : 'Chapters'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Delete Episodes Confirmation Dialog */}
        {episodesToDelete.length > 0 && (
          <AlertDialog open={true} onOpenChange={(open) => !open && setEpisodesToDelete([])}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Episodes</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {episodesToDelete.length === 1 ? 'this episode' : `these ${episodesToDelete.length} episodes`}? 
                  This action cannot be undone. All chapters in {episodesToDelete.length === 1 ? 'this episode' : 'these episodes'} will be unassigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEpisodesToDelete([])}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteEpisodes} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {episodesToDelete.length === 1 ? 'Episode' : 'Episodes'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {/* Prompt Manager for New Projects */}
        {showPromptManager && (
          <PromptManager
            onPromptSelect={handlePromptSelect}
            onClose={handlePromptManagerClose}
          />
        )}

        {/* Project Creation Dialog */}
        <ProjectCreationDialog
          open={showProjectCreationDialog}
          onOpenChange={setShowProjectCreationDialog}
          onProjectCreated={handleProjectCreated}
          user={user}
        />
      </DialogContent>
    </Dialog>
  );
}
