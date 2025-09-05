import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface EpisodeSeparatorProps {
  dropId: string;
  label?: string;
  isDragging?: boolean;
  hasChapters?: boolean;
  children?: React.ReactNode;
}

export function EpisodeSeparator({ 
  dropId, 
  label, 
  isDragging = false, 
  hasChapters = false,
  children 
}: EpisodeSeparatorProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-200",
        // Always show a subtle separator
        "border-t border-dashed border-muted-foreground/20",
        // Enhanced during drag operations
        isDragging && "border-muted-foreground/40",
        // Highlighted when over
        isOver && "border-primary bg-primary/5 border-solid",
        // Padding for content
        hasChapters && "pt-2 pb-1",
        !hasChapters && "py-1"
      )}
    >
      {/* Drop zone indicator */}
      {isDragging && (
        <div className={cn(
          "absolute -top-3 left-1/2 transform -translate-x-1/2 z-10",
          "px-2 py-1 text-xs bg-background border rounded-md shadow-sm",
          "transition-all duration-200",
          isOver ? "text-primary border-primary bg-primary/10 scale-105" : "text-muted-foreground border-muted"
        )}>
          {isOver ? (
            <span className="font-medium">Drop here</span>
          ) : (
            <span>{label || "Drop between episodes"}</span>
          )}
        </div>
      )}

      {/* Content area for inter-episode chapters */}
      {hasChapters && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <ChevronDown className="h-3 w-3" />
            <span className="font-medium">{label}</span>
          </div>
          {children}
        </div>
      )}

      {/* Enhanced hover feedback when dragging */}
      {isDragging && isOver && !hasChapters && (
        <div className="flex items-center justify-center py-2">
          <div className="text-xs text-primary font-medium">
            Drop here to place {label?.toLowerCase() || "between episodes"}
          </div>
        </div>
      )}
    </div>
  );
}