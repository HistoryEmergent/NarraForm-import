import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { Chapter } from "@/types/chapter";
import { ShotType, TextSelection, SourceType } from "@/types/shot";
import { useTextSelection } from "@/hooks/useTextSelection";
import { TextWithHighlights } from "@/components/TextWithHighlights";
import { ShotSelectionMenu } from "@/components/ShotSelectionMenu";

interface ScriptViewProps {
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

export const ScriptView = ({ 
  chapter, 
  isEditing, 
  onTextChange,
  highlights = [],
  showHighlights = false,
  onCreateShot,
  onShotClick,
  enableShotSelection = false,
  onToggleEdit
}: ScriptViewProps) => {
  const { textRef, selectionMenu, handleTextSelection, handleCreateShot } = useTextSelection({
    sourceType: 'processed' as SourceType,
    enabled: enableShotSelection && !isEditing && !!onCreateShot,
    onCreateShot: onCreateShot || (() => {})
  });
  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Script</h3>
          {onToggleEdit && (
            <Button
              onClick={onToggleEdit}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Editing Script
            </Button>
          )}
        </div>
        <Textarea
          value={chapter.processedText || ''}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Processed script will appear here..."
          className="flex-1 resize-none"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Script</h3>
        {onToggleEdit && chapter.processedText && (
          <Button
            onClick={onToggleEdit}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit Script
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
            text={chapter.processedText || "No processed script available. Click 'Process with AI' to generate."}
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