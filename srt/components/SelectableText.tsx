import React, { useState, useRef, useCallback } from 'react';
import { ShotType, shotTypeLabels, TextSelection, SourceType } from '@/types/shot';

interface SelectableTextProps {
  text: string;
  sourceType: SourceType;
  highlights?: Array<{
    startPosition: number;
    endPosition: number;
    shotType: ShotType;
    id: string;
  }>;
  showHighlights: boolean;
  onCreateShot: (selection: TextSelection, shotType: ShotType) => void;
  onShotClick?: (shotId: string) => void;
}

export const SelectableText: React.FC<SelectableTextProps> = ({
  text,
  sourceType,
  highlights = [],
  showHighlights,
  onCreateShot,
  onShotClick
}) => {
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selection: TextSelection | null;
  }>({ visible: false, x: 0, y: 0, selection: null });

  const textRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) {
      setSelectionMenu({ visible: false, x: 0, y: 0, selection: null });
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Calculate positions relative to the text container
    const containerRect = textRef.current.getBoundingClientRect();
    const startPosition = getTextPosition(range.startContainer, range.startOffset);
    const endPosition = getTextPosition(range.endContainer, range.endOffset);

    const textSelection: TextSelection = {
      text: selectedText,
      startPosition,
      endPosition,
      sourceType
    };

    setSelectionMenu({
      visible: true,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 10,
      selection: textSelection
    });
  }, [sourceType]);

  const getTextPosition = (node: Node, offset: number): number => {
    if (!textRef.current) return 0;
    
    const walker = document.createTreeWalker(
      textRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let position = 0;
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return position + offset;
      }
      position += currentNode.textContent?.length || 0;
    }
    
    return position;
  };

  const handleCreateShot = (shotType: ShotType) => {
    if (selectionMenu.selection) {
      onCreateShot(selectionMenu.selection, shotType);
      setSelectionMenu({ visible: false, x: 0, y: 0, selection: null });
      window.getSelection()?.removeAllRanges();
    }
  };

  const renderTextWithHighlights = () => {
    if (!showHighlights || highlights.length === 0) {
      return <span>{text}</span>;
    }

    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      const { startPosition, endPosition, shotType, id } = highlight;
      
      // Add text before highlight
      if (startPosition > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, startPosition)}
          </span>
        );
      }

      // Add highlighted text
      const colorClass = getShotTypeColorClass(shotType);
      parts.push(
        <span
          key={`highlight-${id}`}
          className={`${colorClass} cursor-pointer rounded px-1 py-0.5 transition-colors hover:opacity-80`}
          onClick={() => onShotClick?.(id)}
          title={`${shotTypeLabels[shotType]} - Click to view shot`}
          data-shot-id={id}
        >
          {text.slice(startPosition, endPosition)}
        </span>
      );

      lastIndex = endPosition;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const getShotTypeColorClass = (shotType: ShotType): string => {
    const colorMap: Record<ShotType, string> = {
      'EXTREME_CLOSE_UP': 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
      'CLOSE_UP': 'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'MEDIUM_CLOSE_UP': 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'MEDIUM_SHOT': 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
      'MEDIUM_WIDE_SHOT': 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'WIDE_SHOT': 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'EXTREME_WIDE_SHOT': 'bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return colorMap[shotType];
  };

  return (
    <div className="relative">
      <div
        ref={textRef}
        className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded border cursor-text select-text"
        onMouseUp={handleTextSelection}
      >
        {renderTextWithHighlights()}
      </div>

      {selectionMenu.visible && (
        <div
          className="absolute z-50 bg-background border rounded-lg shadow-lg p-1 min-w-48"
          style={{
            left: selectionMenu.x,
            top: selectionMenu.y,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
            Create shot from selection
          </div>
          <div className="space-y-0.5">
            {Object.entries(shotTypeLabels).map(([value, label]) => (
              <button
                key={value}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                onClick={() => handleCreateShot(value as ShotType)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};