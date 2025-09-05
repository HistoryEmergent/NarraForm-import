import { useState, useRef, useCallback } from 'react';
import { ShotType, TextSelection, SourceType } from '@/types/shot';

interface UseTextSelectionProps {
  sourceType: SourceType;
  enabled: boolean;
  onCreateShot: (selection: TextSelection, shotType: ShotType) => void;
}

export const useTextSelection = ({ sourceType, enabled, onCreateShot }: UseTextSelectionProps) => {
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selection: TextSelection | null;
  }>({ visible: false, x: 0, y: 0, selection: null });

  const textRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    if (!enabled) return;
    
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
  }, [sourceType, enabled]);

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

  const clearSelection = () => {
    setSelectionMenu({ visible: false, x: 0, y: 0, selection: null });
  };

  return {
    textRef,
    selectionMenu,
    handleTextSelection,
    handleCreateShot,
    clearSelection
  };
};