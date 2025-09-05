import React from 'react';
import { ShotType, shotTypeLabels } from '@/types/shot';

interface ShotSelectionMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onCreateShot: (shotType: ShotType) => void;
}

export const ShotSelectionMenu: React.FC<ShotSelectionMenuProps> = ({
  visible,
  x,
  y,
  onCreateShot
}) => {
  if (!visible) return null;

  return (
    <div
      className="absolute z-50 bg-background border rounded-lg shadow-lg p-1 min-w-48"
      style={{
        left: x,
        top: y,
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
            onClick={() => onCreateShot(value as ShotType)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};