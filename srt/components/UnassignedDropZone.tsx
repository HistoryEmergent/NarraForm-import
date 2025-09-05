import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface UnassignedDropZoneProps {
  children: React.ReactNode;
}

export function UnassignedDropZone({ children }: UnassignedDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned-area',
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-h-[60px] rounded border-2 border-dashed border-transparent transition-colors",
        isOver && "border-primary bg-primary/5",
        !children && "flex items-center justify-center text-muted-foreground text-sm"
      )}
    >
      {children || "Drop chapters here to unassign them from episodes"}
    </div>
  );
}