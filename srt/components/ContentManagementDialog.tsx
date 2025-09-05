import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Film, Plus, FolderPlus, Merge, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  originalText: string;
  processedText?: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  chapterIds: string[];
}

interface ContentManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChapterCreate: (chapter: Chapter, position?: { type: 'beginning' | 'end' | 'after', afterChapterId?: string }) => void;
  onEpisodeCreate: (episode: Episode) => void;
  onChapterMerge: (mergedChapters: Chapter[]) => void;
  onProjectCreate?: (projectData: { title: string; description: string; type: 'novel' | 'screenplay' | 'series' }, fileData?: any) => void;
  chapters: Chapter[];
  episodes: Episode[];
  projectType: 'novel' | 'screenplay' | 'series';
  initialTab?: string;
  user?: any;
}

export function ContentManagementDialog({ 
  open, 
  onOpenChange, 
  onChapterCreate,
  onEpisodeCreate,
  onChapterMerge,
  onProjectCreate,
  chapters,
  episodes,
  projectType,
  initialTab = "create-chapter",
  user
}: ContentManagementDialogProps) {
  const { toast } = useToast();
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Chapter creation state
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [chapterType, setChapterType] = useState<'chapter' | 'scene'>(projectType === 'screenplay' ? 'scene' : 'chapter');
  const [chapterPosition, setChapterPosition] = useState<'beginning' | 'end' | 'after'>('end');
  const [afterChapterId, setAfterChapterId] = useState<string>('');
  
  // Episode creation state
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  
  // Chapter merging state
  const [selectedMergeChapterIds, setSelectedMergeChapterIds] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState('');

  // Project creation state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectType_new, setProjectType_new] = useState<'novel' | 'screenplay' | 'series'>('novel');
  const [showFileImport, setShowFileImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const unassignedChapters = chapters.filter(chapter => !chapter.episodeId);

  const handleCreateChapter = () => {
    if (!chapterTitle.trim() || !chapterContent.trim()) {
      toast({
        title: "Error",
        description: "Please provide both a title and content for the chapter.",
        variant: "destructive"
      });
      return;
    }

    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: chapterTitle.trim(),
      originalText: chapterContent.trim(),
      type: chapterType,
      contentType: projectType === 'series' ? 'novel' : projectType,
    };

    const position = { 
      type: chapterPosition, 
      ...(chapterPosition === 'after' && afterChapterId ? { afterChapterId } : {})
    };
    onChapterCreate(newChapter, position);
    
    // Reset form
    setChapterTitle('');
    setChapterContent('');
    setChapterType(projectType === 'screenplay' ? 'scene' : 'chapter');
    setChapterPosition('end');
    setAfterChapterId('');
    
    onOpenChange(false);
    
    toast({
      title: "Chapter Created",
      description: `"${newChapter.title}" has been added to your project.`
    });
  };

  const handleCreateEpisode = () => {
    if (!episodeTitle.trim() || selectedChapterIds.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a title and select at least one chapter.",
        variant: "destructive"
      });
      return;
    }

    const newEpisode: Episode = {
      id: `episode-${Date.now()}`,
      title: episodeTitle.trim(),
      description: episodeDescription.trim() || undefined,
      chapterIds: selectedChapterIds
    };

    onEpisodeCreate(newEpisode);
    
    // Reset form
    setEpisodeTitle("");
    setEpisodeDescription("");
    setSelectedChapterIds([]);
    
    onOpenChange(false);
    
    toast({
      title: "Episode Created",
      description: `"${newEpisode.title}" has been created with ${newEpisode.chapterIds.length} chapters.`
    });
  };

  const handleMergeChapters = () => {
    if (selectedMergeChapterIds.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 chapters to merge.",
        variant: "destructive"
      });
      return;
    }

    const chaptersToMerge = chapters.filter(ch => selectedMergeChapterIds.includes(ch.id));
    const remainingChapters = chapters.filter(ch => !selectedMergeChapterIds.includes(ch.id));
    
    // Create merged chapter
    const mergedContent = chaptersToMerge.map(ch => ch.originalText).join('\n\n');
    const mergedChapter: Chapter = {
      id: `merged-${Date.now()}`,
      title: mergeTitle || `Merged ${chaptersToMerge[0].type}`,
      originalText: mergedContent,
      type: chaptersToMerge[0].type,
      contentType: chaptersToMerge[0].contentType,
      episodeId: chaptersToMerge[0].episodeId
    };

    // Find the position to insert the merged chapter (where the first selected chapter was)
    const firstSelectedIndex = chapters.findIndex(ch => ch.id === selectedMergeChapterIds[0]);
    const newChapters = [...chapters];
    
    // Remove all selected chapters
    selectedMergeChapterIds.forEach(id => {
      const index = newChapters.findIndex(ch => ch.id === id);
      if (index !== -1) {
        newChapters.splice(index, 1);
      }
    });
    
    // Insert merged chapter at the position of the first selected chapter
    const insertIndex = Math.min(firstSelectedIndex, newChapters.length);
    newChapters.splice(insertIndex, 0, mergedChapter);

    onChapterMerge(newChapters);
    
    // Reset form
    setSelectedMergeChapterIds([]);
    setMergeTitle('');
    
    onOpenChange(false);
    
    toast({
      title: "Chapters Merged",
      description: "Selected chapters have been merged successfully."
    });
  };

  const handleCreateProject = async () => {
    if (!projectTitle.trim()) {
      toast({
        title: "Error",
        description: "Please provide a project title.",
        variant: "destructive"
      });
      return;
    }

    const projectData = {
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      type: projectType_new
    };

    const fileData = selectedFile ? await parseSelectedFile() : null;

    if (onProjectCreate) {
      onProjectCreate(projectData, fileData);
    }
    
    // Reset form
    setProjectTitle('');
    setProjectDescription('');
    setProjectType_new('novel');
    setSelectedFile(null);
    setShowFileImport(false);
    
    onOpenChange(false);
  };

  const parseSelectedFile = async () => {
    if (!selectedFile) return null;

    try {
      const { parseFile } = await import('@/utils/fileParser');
      const contentType = projectType_new === 'series' ? 'novel' : projectType_new;
      const parsedContent = await parseFile(selectedFile, contentType);
      
      // Structure the data as expected by handleProjectCreate
      return {
        parsedContent,
        contentType,
        fileName: selectedFile.name
      };
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "File Parse Error",
        description: "Failed to parse the selected file.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleChapterToggle = (chapterId: string, index: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastClickedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeChapterIds = unassignedChapters.slice(start, end + 1).map(c => c.id);
      
      setSelectedChapterIds(prev => {
        const newSelected = new Set(prev);
        const shouldSelect = selectedChapterIds.includes(unassignedChapters[lastClickedIndex].id);
        
        rangeChapterIds.forEach(id => {
          if (shouldSelect) {
            newSelected.add(id);
          } else {
            newSelected.delete(id);
          }
        });
        return Array.from(newSelected);
      });
    } else {
      // Normal click: toggle single item
      setSelectedChapterIds(prev => 
        prev.includes(chapterId) 
          ? prev.filter(id => id !== chapterId)
          : [...prev, chapterId]
      );
    }
    setLastClickedIndex(index);
  };

  const handleMergeChapterToggle = (chapterId: string) => {
    setSelectedMergeChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleCancel = () => {
    // Reset all forms
    setChapterTitle('');
    setChapterContent('');
    setChapterType(projectType === 'screenplay' ? 'scene' : 'chapter');
    setChapterPosition('end');
    setAfterChapterId('');
    setEpisodeTitle('');
    setEpisodeDescription('');
    setSelectedChapterIds([]);
    setSelectedMergeChapterIds([]);
    setMergeTitle('');
    setProjectTitle('');
    setProjectDescription('');
    setProjectType_new('novel');
    setSelectedFile(null);
    setShowFileImport(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Content
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create-chapter" className="gap-2">
              <Plus className="h-4 w-4" />
              Create {chapterType === 'chapter' ? 'Chapter' : 'Scene'}
            </TabsTrigger>
            <TabsTrigger value="create-episode" className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Create Episode
            </TabsTrigger>
            <TabsTrigger value="merge-chapters" className="gap-2" disabled={chapters.length < 2}>
              <Merge className="h-4 w-4" />
              Merge Content
            </TabsTrigger>
            {onProjectCreate && (
              <TabsTrigger value="create-project" className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Create Project
              </TabsTrigger>
            )}
          </TabsList>
          
          <div className="flex-1 min-h-0 overflow-auto">
            <TabsContent value="create-chapter" className="h-full overflow-auto space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter-title">Title</Label>
                  <Input
                    id="chapter-title"
                    placeholder={`Enter ${chapterType} title...`}
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chapter-type">Type</Label>
                  <Select value={chapterType} onValueChange={(value: 'chapter' | 'scene') => setChapterType(value)}>
                    <SelectTrigger id="chapter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter-position">Position</Label>
                <Select value={chapterPosition} onValueChange={(value: 'beginning' | 'end' | 'after') => setChapterPosition(value)}>
                  <SelectTrigger id="chapter-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginning">At beginning</SelectItem>
                    <SelectItem value="end">At end</SelectItem>
                    <SelectItem value="after">After specific chapter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {chapterPosition === 'after' && chapters.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="after-chapter">After Chapter</Label>
                  <Select value={afterChapterId} onValueChange={setAfterChapterId}>
                    <SelectTrigger id="after-chapter">
                      <SelectValue placeholder="Select chapter..." />
                    </SelectTrigger>
                     <SelectContent className="bg-background border shadow-md z-50">
                       {chapters.map((chapter) => (
                         <SelectItem key={chapter.id} value={chapter.id}>
                           {chapter.title}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="chapter-content">Content</Label>
                <Textarea
                  id="chapter-content"
                  placeholder="Paste or type your chapter content here..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="create-episode" className="h-full overflow-auto space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="episode-title">Episode Title</Label>
                  <Input
                    id="episode-title"
                    placeholder="e.g., Episode 1: The Beginning"
                    value={episodeTitle}
                    onChange={(e) => setEpisodeTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="episode-description">Description (Optional)</Label>
                  <Input
                    id="episode-description"
                    placeholder="Brief description of this episode"
                    value={episodeDescription}
                    onChange={(e) => setEpisodeDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Chapters</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {unassignedChapters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No unassigned chapters available
                      </p>
                    ) : (
                      unassignedChapters.map((chapter, index) => (
                        <div 
                          key={chapter.id} 
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded hover:bg-accent/50 cursor-pointer",
                            selectedChapterIds.includes(chapter.id) && "bg-accent/20"
                          )}
                          onClick={(e) => handleChapterToggle(chapter.id, index, e)}
                        >
                          <Checkbox
                            id={chapter.id}
                            checked={selectedChapterIds.includes(chapter.id)}
                            onCheckedChange={() => handleChapterToggle(chapter.id, index)}
                          />
                          <Label 
                            htmlFor={chapter.id} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            {chapter.title}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="merge-chapters" className="h-full overflow-auto space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="merge-title">Title for merged {chapters[0]?.type || 'chapter'}</Label>
                  <Input
                    id="merge-title"
                    value={mergeTitle}
                    onChange={(e) => setMergeTitle(e.target.value)}
                    placeholder={`Merged ${chapters[0]?.type || 'chapter'}`}
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <Label>Select {chapters[0]?.type || 'chapter'}s to merge:</Label>
                  {chapters.map((chapter, index) => (
                    <div key={chapter.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`merge-${chapter.id}`}
                        checked={selectedMergeChapterIds.includes(chapter.id)}
                        onCheckedChange={() => handleMergeChapterToggle(chapter.id)}
                      />
                      <Label htmlFor={`merge-${chapter.id}`} className="text-sm">
                        {index + 1}. {chapter.title}
                      </Label>
                    </div>
                  ))}
                </div>

                {selectedMergeChapterIds.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected {selectedMergeChapterIds.length} {chapters[0]?.type || 'chapter'}s to merge
                  </div>
                )}
              </div>
            </TabsContent>

            {onProjectCreate && (
              <TabsContent value="create-project" className="h-full overflow-auto space-y-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-title">Project Title</Label>
                    <Input
                      id="project-title"
                      placeholder="Enter project title..."
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description (Optional)</Label>
                    <Input
                      id="project-description"
                      placeholder="Brief description of your project"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-type">Project Type</Label>
                    <Select value={projectType_new} onValueChange={(value: 'novel' | 'screenplay' | 'series') => setProjectType_new(value)}>
                      <SelectTrigger id="project-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novel">Novel</SelectItem>
                        <SelectItem value="screenplay">Screenplay</SelectItem>
                        <SelectItem value="series">Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="import-file"
                        checked={showFileImport}
                        onChange={(e) => setShowFileImport(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="import-file">Import content from file</Label>
                    </div>

                    {showFileImport && (
                      <div className="space-y-2">
                        <Label htmlFor="file-input">Select File</Label>
                         <Input
                           id="file-input"
                           type="file"
                           accept=".txt,.rtf,.docx,.doc,.fdx,.epub"
                           onChange={handleFileSelect}
                         />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Tabs value={activeTab} asChild>
            <div>
              <TabsContent value="create-chapter" asChild>
                <Button 
                  onClick={handleCreateChapter} 
                  disabled={!chapterTitle.trim() || !chapterContent.trim() || (chapterPosition === 'after' && !afterChapterId)}
                >
                  Create {chapterType === 'chapter' ? 'Chapter' : 'Scene'}
                </Button>
              </TabsContent>
              <TabsContent value="create-episode" asChild>
                <Button 
                  onClick={handleCreateEpisode}
                  disabled={!episodeTitle.trim() || selectedChapterIds.length === 0}
                >
                  Create Episode
                </Button>
              </TabsContent>
              <TabsContent value="merge-chapters" asChild>
                <Button 
                  onClick={handleMergeChapters} 
                  disabled={selectedMergeChapterIds.length < 2}
                >
                  Merge {selectedMergeChapterIds.length} {chapters[0]?.type || 'Chapter'}s
                </Button>
              </TabsContent>
              {onProjectCreate && (
                <TabsContent value="create-project" asChild>
                  <Button 
                    onClick={handleCreateProject} 
                    disabled={!projectTitle.trim()}
                  >
                    Create Project
                  </Button>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}