import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderPlus } from "lucide-react";
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

interface EpisodeDialogProps {
  chapters: Chapter[];
  episodes: Episode[];
  onCreateEpisode: (episode: Episode) => void;
  buttonText?: string;
}

export function EpisodeDialog({ chapters, episodes, onCreateEpisode, buttonText = "Create Episode" }: EpisodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const unassignedChapters = chapters.filter(chapter => !chapter.episodeId);

  const handleSubmit = () => {
    if (!title.trim() || selectedChapterIds.length === 0) return;

    const newEpisode: Episode = {
      id: `episode-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      chapterIds: selectedChapterIds
    };

    onCreateEpisode(newEpisode);
    
    // Reset form
    setTitle("");
    setDescription("");
    setSelectedChapterIds([]);
    setIsOpen(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create Episode
          </DialogTitle>
          <DialogDescription>
            Group chapters together into episodes for better organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="episode-title">Episode Title</Label>
            <Input
              id="episode-title"
              placeholder="e.g., Episode 1: The Beginning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="episode-description">Description (Optional)</Label>
            <Input
              id="episode-description"
              placeholder="Brief description of this episode"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || selectedChapterIds.length === 0}
          >
            Create Episode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}