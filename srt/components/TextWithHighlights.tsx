import React from 'react';
import { ShotType, shotTypeLabels } from '@/types/shot';

interface Highlight {
  startPosition: number;
  endPosition: number;
  shotType: ShotType;
  id: string;
}

interface TextWithHighlightsProps {
  text: string;
  highlights?: Highlight[];
  showHighlights: boolean;
  onShotClick?: (shotId: string) => void;
}

export const TextWithHighlights: React.FC<TextWithHighlightsProps> = ({
  text,
  highlights = [],
  showHighlights,
  onShotClick
}) => {
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

  return <>{parts}</>;
};