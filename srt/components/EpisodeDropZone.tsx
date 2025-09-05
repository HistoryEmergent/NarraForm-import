import { useDroppable } from '@dnd-kit/core';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EpisodeDropZoneProps {
  episodeId: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function EpisodeDropZone({ episodeId, title, isExpanded, onToggle, children }: EpisodeDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `episode-header-${episodeId}`,
  });

  return (
    <div ref={setNodeRef}>
      <div
        className={cn(
          "flex items-center gap-2 p-2 font-medium cursor-pointer rounded transition-colors",
          "hover:bg-accent/50",
          isOver && "bg-primary/10 border-2 border-primary border-dashed"
        )}
        onClick={onToggle}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1">{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>
      
      <div className="ml-6">
        {children}
      </div>
    </div>
  );
}