import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Film, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  title: string;
  originalText: string;
  processedText?: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
}

interface ChapterCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChapterCreate: (chapter: Chapter) => void;
  projectType: 'novel' | 'screenplay' | 'series';
}

export function ChapterCreateDialog({ 
  open, 
  onOpenChange, 
  onChapterCreate, 
  projectType 
}: ChapterCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'chapter' | 'scene'>(projectType === 'screenplay' ? 'scene' : 'chapter');
  const { toast } = useToast();

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please provide both a title and content for the chapter.",
        variant: "destructive"
      });
      return;
    }

    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: title.trim(),
      originalText: content.trim(),
      type,
      contentType: projectType === 'series' ? 'novel' : projectType,
    };

    onChapterCreate(newChapter);
    
    // Reset form
    setTitle('');
    setContent('');
    setType(projectType === 'screenplay' ? 'scene' : 'chapter');
    
    onOpenChange(false);
    
    toast({
      title: "Chapter Created",
      description: `"${newChapter.title}" has been added to your project.`
    });
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setType(projectType === 'screenplay' ? 'scene' : 'chapter');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New {type === 'chapter' ? 'Chapter' : 'Scene'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={`Enter ${type} title...`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: 'chapter' | 'scene') => setType(value)}>
                <SelectTrigger id="type">
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
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Paste or type your chapter content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !content.trim()}>
            Create {type === 'chapter' ? 'Chapter' : 'Scene'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}