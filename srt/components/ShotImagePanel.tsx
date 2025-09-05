import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shot } from '@/types/shot';
import { ShotImageSection } from './ShotImageSection';

interface ShotImagePanelProps {
  shots: Shot[];
}

export const ShotImagePanel: React.FC<ShotImagePanelProps> = ({ shots }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          {shots.map((shot, index) => (
            <ShotImageSection
              key={shot.id}
              shot={shot}
              shotNumber={index + 1}
              allShots={shots}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};