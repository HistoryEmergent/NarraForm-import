import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Merge } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
  type: 'chapter' | 'scene';
}

interface ChapterMergerProps {
  sections: Section[];
  onMerge: (mergedSections: Section[]) => void;
}

export function ChapterMerger({ sections, onMerge }: ChapterMergerProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [open, setOpen] = useState(false);

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleMerge = () => {
    if (selectedSections.length < 2) return;

    const sectionsToMerge = sections.filter(s => selectedSections.includes(s.id));
    const remainingSections = sections.filter(s => !selectedSections.includes(s.id));
    
    // Create merged section
    const mergedContent = sectionsToMerge.map(s => s.content).join('\n\n');
    const mergedSection: Section = {
      id: `merged-${Date.now()}`,
      title: newTitle || `Merged ${sectionsToMerge[0].type}`,
      content: mergedContent,
      type: sectionsToMerge[0].type
    };

    // Find the position to insert the merged section (where the first selected section was)
    const firstSelectedIndex = sections.findIndex(s => s.id === selectedSections[0]);
    const newSections = [...sections];
    
    // Remove all selected sections
    selectedSections.forEach(id => {
      const index = newSections.findIndex(s => s.id === id);
      if (index !== -1) {
        newSections.splice(index, 1);
      }
    });
    
    // Insert merged section at the position of the first selected section
    const insertIndex = Math.min(firstSelectedIndex, newSections.length);
    newSections.splice(insertIndex, 0, mergedSection);

    onMerge(newSections);
    setSelectedSections([]);
    setNewTitle('');
    setOpen(false);
  };

  const sortedSelectedSections = selectedSections.sort((a, b) => {
    const indexA = sections.findIndex(s => s.id === a);
    const indexB = sections.findIndex(s => s.id === b);
    return indexA - indexB;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Merge className="h-4 w-4 mr-2" />
          Merge {sections[0]?.type === 'chapter' ? 'Chapters' : 'Scenes'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge {sections[0]?.type === 'chapter' ? 'Chapters' : 'Scenes'}</DialogTitle>
          <DialogDescription>
            Select the {sections[0]?.type === 'chapter' ? 'chapters' : 'scenes'} you want to merge together. They will be combined in order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merged-title">Title for merged {sections[0]?.type}</Label>
            <Input
              id="merged-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`Merged ${sections[0]?.type}`}
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <Label>Select {sections[0]?.type === 'chapter' ? 'chapters' : 'scenes'} to merge:</Label>
            {sections.map((section, index) => (
              <div key={section.id} className="flex items-center space-x-2">
                <Checkbox
                  id={section.id}
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => handleSectionToggle(section.id)}
                />
                <Label htmlFor={section.id} className="text-sm">
                  {index + 1}. {section.title}
                </Label>
              </div>
            ))}
          </div>

          {selectedSections.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Selected {selectedSections.length} {sections[0]?.type === 'chapter' ? 'chapters' : 'scenes'} to merge
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMerge} 
              disabled={selectedSections.length < 2}
            >
              Merge {selectedSections.length} {sections[0]?.type === 'chapter' ? 'Chapters' : 'Scenes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}