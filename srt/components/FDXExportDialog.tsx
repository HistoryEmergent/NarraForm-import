import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface Reports {
  soundEffects: string[];
  characters: string[];
}

interface Chapter {
  id: string;
  title: string;
  originalText: string;
  processedText?: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
  reports?: Reports;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  chapterIds: string[];
}

interface FDXExportDialogProps {
  chapters: Chapter[];
  episodes: Episode[];
  selectedProject: string | null;
  disabled?: boolean;
}

export function FDXExportDialog({ chapters, episodes, selectedProject, disabled }: FDXExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<'project' | 'episode'>('project');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');

  // Check if any content is processed
  const hasProcessedContent = chapters.some(chapter => chapter.processedText);
  const hasEpisodes = episodes.length > 0;

  // Get chapters for each episode with processed content
  const episodesWithProcessedContent = episodes.filter(episode => {
    const episodeChapters = chapters.filter(chapter => chapter.episodeId === episode.id);
    return episodeChapters.some(chapter => chapter.processedText);
  });

  const canExport = hasProcessedContent && (exportType === 'project' || selectedEpisode);

  const generateFDXContent = (chaptersToExport: Chapter[]): string => {
    const fdxHeader = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
<Content>`;

    const fdxFooter = `</Content>
</FinalDraft>`;

    let fdxBody = '';

    chaptersToExport.forEach((chapter, index) => {
      const content = chapter.processedText || chapter.originalText;
      
      // Add title as scene heading
      fdxBody += `
<Paragraph Type="Scene Heading">
<Text>${chapter.title}</Text>
</Paragraph>`;

      // Split content into lines and format as FDX elements
      const lines = content.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Detect different screenplay elements
        if (trimmedLine.match(/^(INT\.|EXT\.|INTERIOR|EXTERIOR)/i)) {
          // Scene heading
          fdxBody += `
<Paragraph Type="Scene Heading">
<Text>${trimmedLine}</Text>
</Paragraph>`;
        } else if (trimmedLine.match(/^[A-Z][A-Z\s]+$/) && trimmedLine.length < 50) {
          // Character name (all caps, short line)
          fdxBody += `
<Paragraph Type="Character">
<Text>${trimmedLine}</Text>
</Paragraph>`;
        } else if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')')) {
          // Parenthetical
          fdxBody += `
<Paragraph Type="Parenthetical">
<Text>${trimmedLine}</Text>
</Paragraph>`;
        } else if (trimmedLine.match(/^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO)/i)) {
          // Transition
          fdxBody += `
<Paragraph Type="Transition">
<Text>${trimmedLine}</Text>
</Paragraph>`;
        } else {
          // Default to action or dialogue based on context
          const elementType = trimmedLine.length > 100 ? "Action" : "Dialogue";
          fdxBody += `
<Paragraph Type="${elementType}">
<Text>${trimmedLine}</Text>
</Paragraph>`;
        }
      });
    });

    return fdxHeader + fdxBody + fdxFooter;
  };

  const handleExport = () => {
    let chaptersToExport: Chapter[] = [];
    let filename = '';

    if (exportType === 'project') {
      chaptersToExport = chapters.filter(chapter => chapter.processedText);
      filename = `project-${selectedProject || 'export'}.fdx`;
    } else if (selectedEpisode) {
      const episode = episodes.find(ep => ep.id === selectedEpisode);
      chaptersToExport = chapters.filter(chapter => 
        chapter.episodeId === selectedEpisode && chapter.processedText
      );
      filename = `episode-${episode?.title.replace(/[^a-zA-Z0-9]/g, '-') || selectedEpisode}.fdx`;
    }

    if (chaptersToExport.length === 0) {
      toast.error("No processed content found to export");
      return;
    }

    const fdxContent = generateFDXContent(chaptersToExport);
    
    // Create and download the file
    const blob = new Blob([fdxContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`FDX file exported: ${filename}`);
    setOpen(false);
  };

  if (!hasProcessedContent) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Download className="h-4 w-4" />
        Export FDX
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Download className="h-4 w-4" />
          Export FDX
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export to FDX
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Choose what you'd like to export to Final Draft format (.fdx):
          </div>

          <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as 'project' | 'episode')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="project" id="project" />
              <Label htmlFor="project">
                Entire Project
                <span className="text-xs text-muted-foreground ml-2">
                  ({chapters.filter(c => c.processedText).length} processed chapters)
                </span>
              </Label>
            </div>
            
            {hasEpisodes && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="episode" id="episode" />
                <Label htmlFor="episode">Single Episode</Label>
              </div>
            )}
          </RadioGroup>

          {exportType === 'episode' && hasEpisodes && (
            <div className="space-y-2">
              <Label>Select Episode:</Label>
              <RadioGroup value={selectedEpisode} onValueChange={setSelectedEpisode}>
                {episodesWithProcessedContent.map((episode) => {
                  const episodeChapters = chapters.filter(c => c.episodeId === episode.id && c.processedText);
                  return (
                    <div key={episode.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={episode.id} id={episode.id} />
                      <Label htmlFor={episode.id} className="flex-1">
                        {episode.title}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({episodeChapters.length} processed chapters)
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!canExport}>
              <Download className="h-4 w-4 mr-2" />
              Export FDX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}