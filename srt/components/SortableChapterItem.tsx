import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Film, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { cleanChapterTitle } from '@/utils/chapterTitleUtils';

interface Chapter {
  id: string;
  title: string;
  originalText: string;
  processedText?: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
  character_count?: number;
}

interface SortableChapterItemProps {
  chapter: Chapter;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onEditingTitleChange: (value: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
  onTitleSave: () => void;
  onTitleCancel?: () => void;
  isInEpisode: boolean;
}

export function SortableChapterItem({
  chapter,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onDoubleClick,
  onEditingTitleChange,
  onTitleKeyDown,
  onTitleSave,
  onTitleCancel,
  isInEpisode,
}: SortableChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = chapter.type === 'chapter' ? FileText : Film;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 cursor-pointer rounded transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-accent text-accent-foreground",
        isDragging && "opacity-50"
      )}
      onClick={(e) => !isEditing && onSelect(e)}
      onDoubleClick={() => !isEditing && onDoubleClick()}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing p-1 -ml-1"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <Icon className="h-4 w-4" />
      <div className="flex-1">
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
          <div className="font-medium">{cleanChapterTitle(chapter.title)}</div>
        )}
        <div className="text-xs text-muted-foreground">
          {chapter.character_count || 0} characters
          {chapter.processedText && (
            <span className="ml-2 text-green-600">• Processed</span>
          )}
        </div>
      </div>
    </div>
  );
}