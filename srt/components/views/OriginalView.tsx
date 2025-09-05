import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { Chapter } from "@/types/chapter";
import { ShotType, TextSelection, SourceType } from "@/types/shot";
import { useTextSelection } from "@/hooks/useTextSelection";
import { TextWithHighlights } from "@/components/TextWithHighlights";
import { ShotSelectionMenu } from "@/components/ShotSelectionMenu";

interface OriginalViewProps {
  chapter: Chapter;
  isEditing: boolean;
  onTextChange: (text: string) => void;
  // Shot list integration props
  highlights?: Array<{
    startPosition: number;
    endPosition: number;
    shotType: ShotType;
    id: string;
    sourceType?: 'original' | 'processed';
  }>;
  showHighlights?: boolean;
  onCreateShot?: (selection: TextSelection, shotType: ShotType) => void;
  onShotClick?: (shotId: string) => void;
  enableShotSelection?: boolean;
  // Edit functionality props
  onToggleEdit?: () => void;
}

export const OriginalView = ({ 
  chapter, 
  isEditing, 
  onTextChange,
  highlights = [],
  showHighlights = false,
  onCreateShot,
  onShotClick,
  enableShotSelection = false,
  onToggleEdit
}: OriginalViewProps) => {
  const { textRef, selectionMenu, handleTextSelection, handleCreateShot } = useTextSelection({
    sourceType: 'original' as SourceType,
    enabled: enableShotSelection && !isEditing && !!onCreateShot,
    onCreateShot: onCreateShot || (() => {})
  });
  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Original Text</h3>
          {onToggleEdit && (
            <Button
              onClick={onToggleEdit}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Editing Original
            </Button>
          )}
        </div>
        <Textarea
          value={chapter.originalText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter your original text here..."
          className="flex-1 resize-none"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Original Text</h3>
        {onToggleEdit && (
          <Button
            onClick={onToggleEdit}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit Original
          </Button>
        )}
      </div>
      <div className="relative flex-1">
        <div
          ref={textRef}
          className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded border flex-1 overflow-auto h-full cursor-text select-text"
          onMouseUp={handleTextSelection}
        >
          <TextWithHighlights
            text={chapter.originalText || "No original text available."}
            highlights={highlights}
            showHighlights={showHighlights}
            onShotClick={onShotClick}
          />
        </div>
        <ShotSelectionMenu
          visible={selectionMenu.visible}
          x={selectionMenu.x}
          y={selectionMenu.y}
          onCreateShot={handleCreateShot}
        />
      </div>
    </div>
  );
};