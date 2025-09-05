import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Film, BookOpen, FileAudio, Radio, Code, FileImage } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { supabase } from "@/integrations/supabase/client";
// Note: We'll create a simple EPUB structure without external library for now

export type ExportFormat = 'fdx' | 'fountain' | 'docx' | 'pdf' | 'epub' | 'html' | 'rtf' | 'txt';
type ExportScope = 'project' | 'episode';

interface Chapter {
  id: string;
  title: string;
  processed_text?: string;
  original_text: string;
  type: string;
}

interface Episode {
  id: string;
  title: string;
  processed_content?: string;
  chapters: Chapter[];
}

interface ExportManagerProps {
  episodes: Episode[];
  projectTitle: string;
  outputMedium?: string;
  unassignedChapters?: Chapter[]; // Add this for chapters not in episodes
}

const FORMAT_OPTIONS = [
  { value: 'fdx', label: 'Final Draft (FDX)', icon: Film, description: 'Industry standard screenplay format' },
  { value: 'fountain', label: 'Fountain', icon: FileText, description: 'Plain text screenplay format' },
  { value: 'docx', label: 'Word Document', icon: FileText, description: 'Microsoft Word format' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Portable document format' },
  { value: 'epub', label: 'EPUB', icon: BookOpen, description: 'Digital book format' },
  { value: 'html', label: 'HTML', icon: Code, description: 'Web page format' },
  { value: 'rtf', label: 'RTF', icon: FileImage, description: 'Rich text format' },
  { value: 'txt', label: 'Plain Text', icon: FileText, description: 'Simple text file' },
];

export function ExportManager({ episodes, projectTitle, outputMedium, unassignedChapters = [] }: ExportManagerProps) {
  const [format, setFormat] = useState<ExportFormat>('fdx');
  const [scope, setScope] = useState<ExportScope>('project');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Show ALL episodes, not just those with content
  const allEpisodes = episodes;
  const episodesWithContent = episodes.filter(ep => 
    ep.processed_content || ep.chapters.some(ch => ch.processed_text)
  );

  // Get processing statistics
  const getProcessingStats = () => {
    let totalChapters = 0;
    let processedChapters = 0;
    
    // Count episode chapters
    episodes.forEach(ep => {
      totalChapters += ep.chapters.length;
      const epProcessedCount = ep.chapters.filter(ch => ch.processed_text && ch.processed_text.trim().length > 0).length;
      processedChapters += epProcessedCount;
    });
    
    // Count unassigned chapters
    totalChapters += unassignedChapters.length;
    const unassignedProcessedCount = unassignedChapters.filter(ch => ch.processed_text && ch.processed_text.trim().length > 0).length;
    processedChapters += unassignedProcessedCount;
    
    return { totalChapters, processedChapters };
  };

  const getEpisodeStats = (episode: Episode) => {
    const totalChapters = episode.chapters.length;
    const processedChapters = episode.chapters.filter(ch => ch.processed_text && ch.processed_text.trim().length > 0).length;
    return { totalChapters, processedChapters };
  };

  const hasProcessedContent = useMemo(() => {
    // If there are no episodes, check unassigned chapters
    if (allEpisodes.length === 0) {
      return unassignedChapters.some(chapter => 
        chapter.processed_text && chapter.processed_text.trim().length > 0
      );
    }
    
    if (scope === 'project') {
      // Check both episodes and unassigned chapters for project scope
      const episodeProcessed = allEpisodes.some(episode => 
        episode.chapters.some(chapter => 
          chapter.processed_text && chapter.processed_text.trim().length > 0
        )
      );
      const unassignedProcessed = unassignedChapters.some(chapter => 
        chapter.processed_text && chapter.processed_text.trim().length > 0
      );
      return episodeProcessed || unassignedProcessed;
    } else if (selectedEpisode) {
      const episode = allEpisodes.find(ep => ep.id === selectedEpisode);
      return episode ? episode.chapters.some(chapter => 
        chapter.processed_text && chapter.processed_text.trim().length > 0
      ) : false;
    }
    return false;
  }, [scope, allEpisodes, selectedEpisode, unassignedChapters]);

  const getRecommendedFormats = () => {
    switch (outputMedium) {
      case 'audio_drama':
      case 'radio_drama':
      case 'podcast_script':
        return ['fdx', 'fountain', 'docx', 'html'];
      case 'screenplay':
        return ['fdx', 'fountain', 'pdf', 'html'];
      case 'novel':
        return ['docx', 'epub', 'pdf', 'rtf'];
      default:
        return ['fdx', 'docx', 'pdf', 'html'];
    }
  };

  const parseAudioDramaContent = (content: string) => {
    const lines = content.split('\n');
    const elements = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Sound effects: [TEXT IN BRACKETS]
      if (line.match(/^\[.+\]$/)) {
        elements.push({ type: 'sound', content: line });
        continue;
      }

      // Scene headings: SCENE: or EXT./INT.
      if (line.match(/^(SCENE:|EXT\.|INT\.|FADE IN:|FADE OUT:)/i)) {
        elements.push({ type: 'scene_heading', content: line });
        continue;
      }

      // Character names: ALL CAPS, standalone, not in brackets
      if (line.match(/^[A-Z][A-Z\s]+[A-Z]$/) && line.length < 50 && !line.includes('[')) {
        // Check if next line looks like dialogue
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.match(/^[A-Z][A-Z\s]+[A-Z]$/) && !nextLine.match(/^\[.+\]$/)) {
          elements.push({ type: 'character', content: line });
          continue;
        }
      }

      // Parentheticals: (action)
      if (line.match(/^\(.+\)$/)) {
        elements.push({ type: 'parenthetical', content: line });
        continue;
      }

      // Check if this line follows a character name (dialogue)
      const prevElement = elements[elements.length - 1];
      if (prevElement?.type === 'character') {
        elements.push({ type: 'dialogue', content: line });
        continue;
      }

      // Everything else is action/description
      elements.push({ type: 'action', content: line });
    }

    return elements;
  };

  const generateFDXContent = (chaptersToExport: Chapter[]): string => {
    const escapeXml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let fdxContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">

<HeaderAndFooter>
</HeaderAndFooter>

<Content>`;

    chaptersToExport.forEach((chapter) => {
      const content = chapter.processed_text || chapter.original_text;
      if (!content) return;
      
      const elements = parseAudioDramaContent(content);

      // Add chapter title as scene heading
      fdxContent += `
        <Paragraph Type="Scene Heading">
            <Text>${escapeXml(chapter.title)}</Text>
        </Paragraph>`;

      elements.forEach(element => {
        const escapedContent = escapeXml(element.content);
        switch (element.type) {
          case 'scene_heading':
            fdxContent += `
        <Paragraph Type="Scene Heading">
            <Text>${escapedContent}</Text>
        </Paragraph>`;
            break;
          case 'character':
            fdxContent += `
        <Paragraph Type="Character">
            <Text>${escapedContent}</Text>
        </Paragraph>`;
            break;
          case 'dialogue':
            fdxContent += `
        <Paragraph Type="Dialogue">
            <Text>${escapedContent}</Text>
        </Paragraph>`;
            break;
          case 'parenthetical':
            fdxContent += `
        <Paragraph Type="Parenthetical">
            <Text>${escapedContent}</Text>
        </Paragraph>`;
            break;
          case 'sound':
            fdxContent += `
        <Paragraph Type="Action">
            <Text Style="Bold">${escapedContent}</Text>
        </Paragraph>`;
            break;
          default:
            fdxContent += `
        <Paragraph Type="Action">
            <Text>${escapedContent}</Text>
        </Paragraph>`;
        }
      });
    });

    fdxContent += `
</Content>

</FinalDraft>`;

    return fdxContent;
  };

  const generateFountainContent = (chaptersToExport: Chapter[]): string => {
    let fountainContent = `Title: ${projectTitle}\n\n`;

    chaptersToExport.forEach((chapter) => {
      const content = chapter.processed_text || chapter.original_text;
      const elements = parseAudioDramaContent(content);

      fountainContent += `= ${chapter.title}\n\n`;

      elements.forEach(element => {
        switch (element.type) {
          case 'scene_heading':
            fountainContent += `${element.content}\n\n`;
            break;
          case 'character':
            fountainContent += `${element.content}\n`;
            break;
          case 'dialogue':
            fountainContent += `${element.content}\n\n`;
            break;
          case 'parenthetical':
            fountainContent += `${element.content}\n`;
            break;
          case 'sound':
            fountainContent += `**${element.content}**\n\n`;
            break;
          default:
            fountainContent += `${element.content}\n\n`;
        }
      });
    });

    return fountainContent;
  };

  const generateDOCXContent = async (chaptersToExport: Chapter[]) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: projectTitle,
            heading: HeadingLevel.TITLE,
          }),
          ...chaptersToExport.flatMap(chapter => {
            const content = chapter.processed_text || chapter.original_text;
            const elements = parseAudioDramaContent(content);
            
            return [
              new Paragraph({
                text: chapter.title,
                heading: HeadingLevel.HEADING_1,
              }),
              ...elements.map(element => {
                switch (element.type) {
                  case 'character':
                    return new Paragraph({
                      children: [new TextRun({ text: element.content, bold: true, allCaps: true })],
                    });
                  case 'sound':
                    return new Paragraph({
                      children: [new TextRun({ text: element.content, italics: true, bold: true })],
                    });
                  default:
                    return new Paragraph({
                      text: element.content,
                    });
                }
              })
            ];
          })
        ]
      }]
    });

    return await Packer.toBlob(doc);
  };

  const generatePDFContent = (chaptersToExport: Chapter[]) => {
    const pdf = new jsPDF();
    let yPosition = 20;

    pdf.setFontSize(18);
    pdf.text(projectTitle, 20, yPosition);
    yPosition += 20;

    chaptersToExport.forEach(chapter => {
      const content = chapter.processed_text || chapter.original_text;
      const elements = parseAudioDramaContent(content);

      // Chapter title
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(chapter.title, 20, yPosition);
      yPosition += 10;

      elements.forEach(element => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        switch (element.type) {
          case 'character':
            pdf.setFont(undefined, 'bold');
            pdf.text(element.content, 60, yPosition);
            break;
          case 'sound':
            pdf.setFont(undefined, 'italic');
            pdf.text(element.content, 20, yPosition);
            break;
          default:
            pdf.setFont(undefined, 'normal');
            const lines = pdf.splitTextToSize(element.content, 170);
            pdf.text(lines, 20, yPosition);
            yPosition += (lines.length - 1) * 5;
        }
        yPosition += 8;
      });
      
      yPosition += 10;
    });

    return pdf;
  };

  const generateHTMLContent = (chaptersToExport: Chapter[]) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${projectTitle}</title>
    <meta charset="UTF-8">
    <style>
        body { 
          font-family: 'Georgia', serif; 
          line-height: 1.6; 
          margin: 2em; 
          color: #333; 
          background-color: #fff;
        }
        h1 { 
          page-break-before: always; 
          text-align: center;
          font-size: 2em;
          margin-bottom: 1em;
        }
        .chapter { 
          margin-bottom: 3em; 
          page-break-before: always;
        }
        .chapter h2 {
          font-size: 1.5em;
          margin-bottom: 1em;
          text-align: center;
        }
        .character { 
          font-weight: bold; 
          text-transform: uppercase; 
          margin-top: 1.5em; 
          margin-bottom: 0.5em;
          text-align: center;
        }
        .sound { 
          font-style: italic; 
          font-weight: bold; 
          text-align: center;
          margin: 1em 0;
        }
        .dialogue {
          margin: 0.5em 0;
          text-align: center;
          max-width: 35em;
          margin-left: auto;
          margin-right: auto;
        }
        .action {
          margin: 1em 0;
        }
        .scene_heading {
          font-weight: bold;
          text-transform: uppercase;
          margin: 2em 0 1em 0;
        }
    </style>
</head>
<body>
    <h1>${projectTitle}</h1>
    ${chaptersToExport.map(chapter => {
      const content = chapter.processed_text || chapter.original_text;
      const elements = parseAudioDramaContent(content);
      
      return `
        <div class="chapter">
          <h2>${chapter.title}</h2>
          ${elements.map(element => {
            switch (element.type) {
              case 'character':
                return `<div class="character">${element.content}</div>`;
              case 'sound':
                return `<div class="sound">${element.content}</div>`;
              case 'dialogue':
                return `<p class="dialogue">${element.content}</p>`;
              case 'scene_heading':
                return `<div class="scene_heading">${element.content}</div>`;
              case 'parenthetical':
                return `<div class="parenthetical">${element.content}</div>`;
              default:
                return `<p class="action">${element.content}</p>`;
            }
          }).join('')}
        </div>
      `;
    }).join('')}
</body>
</html>`;
    
    return htmlContent;
  };

  const generateEPUBContent = (chaptersToExport: Chapter[]) => {
    // Create a simple EPUB structure (mimetype + container + content)
    return generateHTMLContent(chaptersToExport);
  };

  const generateRTFContent = (chaptersToExport: Chapter[]) => {
    let rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}`;
    rtfContent += `\\f0\\fs24 `;
    
    // Title
    rtfContent += `{\\b\\fs32\\qc ${projectTitle}\\par}\\par\\par`;
    
    chaptersToExport.forEach(chapter => {
      const content = chapter.processed_text || chapter.original_text;
      const elements = parseAudioDramaContent(content);
      
      // Chapter title
      rtfContent += `{\\b\\fs28\\qc ${chapter.title}\\par}\\par`;
      
      elements.forEach(element => {
        switch (element.type) {
          case 'character':
            rtfContent += `{\\b\\caps\\qc ${element.content}\\par}`;
            break;
          case 'sound':
            rtfContent += `{\\i\\b\\qc ${element.content}\\par}\\par`;
            break;
          case 'dialogue':
            rtfContent += `{\\qc ${element.content}\\par}\\par`;
            break;
          case 'scene_heading':
            rtfContent += `{\\b\\caps ${element.content}\\par}\\par`;
            break;
          case 'parenthetical':
            rtfContent += `{\\qc ${element.content}\\par}`;
            break;
          default:
            rtfContent += `${element.content}\\par\\par`;
        }
      });
      
      rtfContent += `\\par\\par`;
    });
    
    rtfContent += `}`;
    return rtfContent;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let chaptersToExport: Chapter[] = [];

      if (scope === 'project') {
        // Include both episode chapters and unassigned chapters
        chaptersToExport = [...allEpisodes.flatMap(ep => ep.chapters), ...unassignedChapters];
      } else if (selectedEpisode) {
        const episode = allEpisodes.find(ep => ep.id === selectedEpisode);
        if (episode) {
          chaptersToExport = episode.chapters;
        }
      }

      // Fetch complete chapter data from database for chapters that need it
      const chaptersNeedingFullData = chaptersToExport.filter(ch => !ch.processed_text && !ch.original_text);
      
      if (chaptersNeedingFullData.length > 0) {
        console.log(`Fetching full content for ${chaptersNeedingFullData.length} chapters...`);
        
        const { data: fullChapterData, error } = await supabase
          .from('chapters')
          .select('id, original_text, processed_text')
          .in('id', chaptersNeedingFullData.map(ch => ch.id));
        
        if (error) {
          console.error('Error fetching chapter content:', error);
          toast.error('Failed to fetch chapter content for export');
          return;
        }
        
        // Update chapters with full content
        chaptersToExport = chaptersToExport.map(chapter => {
          const fullData = fullChapterData?.find(fc => fc.id === chapter.id);
          if (fullData) {
            return {
              ...chapter,
              original_text: fullData.original_text || '',
              processed_text: fullData.processed_text || undefined
            };
          }
          return chapter;
        });
      }

      // Load full content for chapters that need it
      const chaptersWithContent = await Promise.all(
        chaptersToExport.map(async (ch) => {
          // If we already have content, use it
          if (ch.processed_text || ch.original_text) {
            return ch;
          }
          
          // Otherwise, fetch from database
          try {
            const { data, error } = await supabase
              .from('chapters')
              .select('original_text, processed_text')
              .eq('id', ch.id)
              .single();
            
            if (error) {
              console.error('Error loading chapter content:', error);
              return ch;
            }
            
            return {
              ...ch,
              original_text: data.original_text || '',
              processed_text: data.processed_text || ''
            };
          } catch (error) {
            console.error('Error loading chapter:', error);
            return ch;
          }
        })
      );

      // Filter to only chapters with some content
      const processedChapters = chaptersWithContent.filter(ch => 
        ch.processed_text || ch.original_text
      );

      if (processedChapters.length === 0) {
        toast.error('No content available for export');
        return;
      }

      chaptersToExport = processedChapters;

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'fdx':
          const fdxContent = generateFDXContent(chaptersToExport);
          blob = new Blob([fdxContent], { type: 'application/xml' });
          filename = `${projectTitle}.fdx`;
          break;

        case 'fountain':
          const fountainContent = generateFountainContent(chaptersToExport);
          blob = new Blob([fountainContent], { type: 'text/plain' });
          filename = `${projectTitle}.fountain`;
          break;

        case 'docx':
          blob = await generateDOCXContent(chaptersToExport);
          filename = `${projectTitle}.docx`;
          break;

        case 'pdf':
          const pdf = generatePDFContent(chaptersToExport);
          blob = pdf.output('blob');
          filename = `${projectTitle}.pdf`;
          break;

        case 'epub':
          const epubContent = generateEPUBContent(chaptersToExport);
          blob = new Blob([epubContent], { type: 'application/epub+zip' });
          filename = `${projectTitle}.epub`;
          break;

        case 'html':
          const htmlContent = generateHTMLContent(chaptersToExport);
          blob = new Blob([htmlContent], { type: 'text/html' });
          filename = `${projectTitle}.html`;
          break;

        case 'rtf':
          const rtfContent = generateRTFContent(chaptersToExport);
          blob = new Blob([rtfContent], { type: 'application/rtf' });
          filename = `${projectTitle}.rtf`;
          break;

        case 'txt':
          const txtContent = chaptersToExport
            .map(ch => `${ch.title}\n\n${ch.processed_text || ch.original_text}`)
            .join('\n\n---\n\n');
          blob = new Blob([txtContent], { type: 'text/plain' });
          filename = `${projectTitle}.txt`;
          break;

        default:
          throw new Error('Unsupported format');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export file');
    } finally {
      setIsExporting(false);
    }
  };

  const recommendedFormats = getRecommendedFormats();
  const selectedFormatOption = FORMAT_OPTIONS.find(opt => opt.value === format);
  const processingStats = getProcessingStats();

  // Check if there are ANY chapters with processed content, regardless of episodes
  const hasAnyProcessedContent = useMemo(() => {
    // Check unassigned chapters
    const hasUnassignedProcessed = unassignedChapters.some(chapter => 
      chapter.processed_text && chapter.processed_text.trim().length > 0
    );
    
    // Check chapters in episodes
    const hasEpisodeProcessed = episodes.some(episode => 
      episode.chapters.some(chapter => 
        chapter.processed_text && chapter.processed_text.trim().length > 0
      )
    );
    
    return hasUnassignedProcessed || hasEpisodeProcessed;
  }, [unassignedChapters, episodes]);

  if (allEpisodes.length === 0 && !hasAnyProcessedContent) {
    return (
      <Button disabled variant="outline" size="sm" className="gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Content</DialogTitle>
          <DialogDescription>
            Choose your export format and scope to download your processed content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isRecommended = recommendedFormats.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`relative p-3 border rounded-lg cursor-pointer transition-colors ${
                      format === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormat(option.value as ExportFormat)}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2 -right-2 text-xs">Recommended</Badge>
                    )}
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Scope Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Scope</Label>
            <RadioGroup value={scope} onValueChange={(value: ExportScope) => setScope(value)}>
                <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="project" />
                <Label htmlFor="project" className="flex-1">
                  Entire Project ({processingStats.processedChapters}/{processingStats.totalChapters} processed)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="episode" id="episode" />
                <Label htmlFor="episode">Single Episode</Label>
              </div>
            </RadioGroup>

            {scope === 'episode' && (
              <div className="space-y-2">
                <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select episode to export" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEpisodes.map((episode) => {
                      const stats = getEpisodeStats(episode);
                      const hasContent = stats.processedChapters > 0;
                      return (
                        <SelectItem 
                          key={episode.id} 
                          value={episode.id}
                          className={!hasContent ? "text-muted-foreground" : ""}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={!hasContent ? "line-through" : ""}>
                              {episode.title}
                            </span>
                            <Badge variant={hasContent ? "default" : "secondary"} className="ml-2 text-xs">
                              {stats.processedChapters}/{stats.totalChapters}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {/* Processing Status Summary */}
                <div className="bg-muted/30 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Processing Status</span>
                    <Badge variant="outline" className="text-xs">
                      {processingStats.processedChapters}/{processingStats.totalChapters} chapters
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {processingStats.processedChapters} of {processingStats.totalChapters} chapters processed
                    {unassignedChapters.length > 0 && (
                      <span className="block text-xs mt-1">
                        Including {unassignedChapters.filter(ch => ch.processed_text && ch.processed_text.trim().length > 0).length} unassigned chapters
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Preview */}
          {selectedFormatOption && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <selectedFormatOption.icon className="h-4 w-4" />
                <span className="font-medium text-sm">Export Preview</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Format: {selectedFormatOption.label}</div>
                <div>
                  Scope: {scope === 'project' 
                    ? `${episodesWithContent.length} episodes` 
                    : selectedEpisode 
                      ? episodesWithContent.find(ep => ep.id === selectedEpisode)?.title
                      : 'No episode selected'
                  }
                </div>
                <div>
                  Content: {scope === 'project' 
                    ? processingStats.processedChapters
                    : selectedEpisode
                      ? allEpisodes.find(ep => ep.id === selectedEpisode)?.chapters.filter(ch => ch.processed_text && ch.processed_text.trim().length > 0).length || 0
                      : 0
                  } processed chapters
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleExport} 
            disabled={isExporting || (scope === 'episode' && !selectedEpisode) || !hasProcessedContent}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : `Export ${selectedFormatOption?.label}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}