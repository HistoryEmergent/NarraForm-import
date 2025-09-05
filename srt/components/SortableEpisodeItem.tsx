import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Folder, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Episode {
  id: string;
  title: string;
  description?: string;
  chapterIds: string[];
}

interface SortableEpisodeItemProps {
  episode: Episode;
  isExpanded: boolean;
  isEditing: boolean;
  editingTitle: string;
  onToggle: () => void;
  onDoubleClick: () => void;
  onEditingTitleChange: (value: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
  onTitleSave: () => void;
  onTitleCancel?: () => void;
  children: React.ReactNode;
  chapterCount?: number; // Optional chapter count to display
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export function SortableEpisodeItem({
  episode,
  isExpanded,
  isEditing,
  editingTitle,
  onToggle,
  onDoubleClick,
  onEditingTitleChange,
  onTitleKeyDown,
  onTitleSave,
  onTitleCancel,
  children,
  chapterCount = 0,
  isSelected = false,
  onSelect,
}: SortableEpisodeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.id });

  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `episode-header-${episode.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <div
        ref={setDropNodeRef}
        className={cn(
          "flex items-center gap-2 p-2 font-medium cursor-pointer rounded transition-colors",
          "hover:bg-accent/50",
          isOver && "bg-primary/10 border-2 border-primary border-dashed",
          isSelected && "bg-primary/10 border border-primary"
        )}
        onClick={() => !isEditing && onToggle()}
        onDoubleClick={() => !isEditing && onDoubleClick()}
      >
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent)}
            onClick={onSelect}
            className="mr-1"
          />
        )}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 -ml-1"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <Folder className="h-4 w-4" />
        <div className="flex-1 flex items-center gap-2">
          {isEditing ? (
            <Input
              value={editingTitle}
              onChange={(e) => onEditingTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onTitleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  onTitleCancel?.();
                }
              }}
              onBlur={onTitleSave}
              className="h-6 text-sm font-medium -my-1 bg-background text-foreground"
              autoFocus
            />
          ) : (
            <>
              <span>{episode.title}</span>
              {chapterCount > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {chapterCount}
                </span>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </>
        )}
      </div>
      
      <div className="ml-6">
        {children}
      </div>
    </div>
  );
}