import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface InterEpisodeDropZoneProps {
  episodeId: string;
  position: 'before' | 'after';
  children?: React.ReactNode;
  isDragging?: boolean;
}

export function InterEpisodeDropZone({ episodeId, position, children, isDragging = false }: InterEpisodeDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${position}-episode-${episodeId}`,
  });

  const hasChapters = Boolean(children);

  // Only show during drag operations or when hovered
  if (!isDragging && !isOver) {
    return null;
  }

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-h-[40px] mx-4 rounded border-2 border-dashed transition-all duration-200",
        hasChapters ? "border-muted bg-muted/20 mb-2" : "border-transparent",
        isOver && "border-primary bg-primary/10 scale-[1.02]",
        !hasChapters && !isOver && isDragging && "opacity-50 hover:opacity-100"
      )}
    >
      {hasChapters ? (
        <div className="p-2">
          <div className="text-xs text-muted-foreground mb-2 font-medium">
            {position === 'before' ? '↑ Before Episode' : '↓ After Episode'}
          </div>
          {children}
        </div>
      ) : isOver ? (
        <div className="flex items-center justify-center text-sm text-muted-foreground p-2">
          Drop chapters here to place {position} episode
        </div>
      ) : (
        <div className="flex items-center justify-center text-xs text-muted-foreground/50 p-2">
          {position === 'before' ? '⬍ Drop before episode' : '⬍ Drop after episode'}
        </div>
      )}
    </div>
  );
}