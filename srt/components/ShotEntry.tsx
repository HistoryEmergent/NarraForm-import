import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shot, ShotType, CameraMovement, shotTypeLabels, cameraMovementLabels } from '@/types/shot';

const shotTypeColors: Record<ShotType, string> = {
  'EXTREME_CLOSE_UP': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'CLOSE_UP': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'MEDIUM_CLOSE_UP': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'MEDIUM_SHOT': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'MEDIUM_WIDE_SHOT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'WIDE_SHOT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'EXTREME_WIDE_SHOT': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
};
import { Edit, Trash2, Eye, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Minus, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ShotImageSection } from '@/components/ShotImageSection';

interface ShotEntryProps {
  shot: Shot;
  index: number;
  onUpdate: (shotId: string, updates: Partial<Shot>) => void;
  onDelete: (shotId: string) => void;
  onGenerateDescription: (shotId: string) => void;
  isGenerating?: boolean;
  storyboardMode?: boolean;
  globalCollapsed?: boolean;
  onExtendText?: (shotId: string, startPosition: number, endPosition: number) => void;
  onShotClick?: (shotId: string) => void;
  allShots?: Shot[];
}

export const ShotEntry: React.FC<ShotEntryProps> = ({
  shot,
  index,
  onUpdate,
  onDelete,
  onGenerateDescription,
  isGenerating = false,
  storyboardMode = false,
  globalCollapsed = true,
  onExtendText,
  onShotClick,
  allShots = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSourceCollapsed, setIsSourceCollapsed] = useState(true);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [tempDescription, setTempDescription] = useState(shot.userDescription || shot.generatedDescription || '');
  const [editValues, setEditValues] = useState({
    shotType: shot.shotType,
    cameraMovement: (shot.cameraMovement as string) || '',
    cameraMovementDescription: shot.cameraMovementDescription || '',
    userDescription: shot.userDescription || ''
  });

  const handleSave = () => {
    onUpdate(shot.id, {
      shotType: editValues.shotType,
      cameraMovement: (editValues.cameraMovement as CameraMovement) || undefined,
      cameraMovementDescription: editValues.cameraMovementDescription || undefined,
      userDescription: editValues.userDescription || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      shotType: shot.shotType,
      cameraMovement: shot.cameraMovement || '',
      cameraMovementDescription: shot.cameraMovementDescription || '',
      userDescription: shot.userDescription || ''
    });
    setIsEditing(false);
  };

  const handleDescriptionSave = () => {
    onUpdate(shot.id, { userDescription: tempDescription });
    setIsEditingDescription(false);
  };

  const handleDescriptionCancel = () => {
    setTempDescription(shot.userDescription || shot.generatedDescription || '');
    setIsEditingDescription(false);
  };

  const handleExtendStart = (direction: 'expand' | 'shrink') => {
    if (!onExtendText) return;
    
    // For this simple implementation, we'll extend/shrink by 10 characters
    let newStart: number;
    if (direction === 'expand') {
      newStart = Math.max(0, shot.startPosition - 10);
    } else {
      newStart = Math.min(shot.startPosition + 10, shot.endPosition - 1);
    }
    
    onExtendText(shot.id, newStart, shot.endPosition);
  };

  const handleExtendEnd = (direction: 'expand' | 'shrink') => {
    if (!onExtendText) return;
    
    // For this simple implementation, we'll extend/shrink by 10 characters  
    let newEnd: number;
    if (direction === 'expand') {
      newEnd = shot.endPosition + 10;
    } else {
      newEnd = Math.max(shot.startPosition + 1, shot.endPosition - 10);
    }
    
    onExtendText(shot.id, shot.startPosition, newEnd);
  };


  const displayDescription = shot.userDescription || shot.generatedDescription || 'No description available';
  
  return (
    <Card className="mb-2">
      <CardContent className="p-2">
        <div className={`${storyboardMode ? 'flex flex-col lg:flex-row gap-4' : ''}`}>
          {/* Shot Details Section */}
          <div className={storyboardMode ? 'flex-1' : ''}>
            <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Shot {index + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                ({shot.sourceType}) {shot.startPosition}-{shot.endPosition}
              </span>
              {onExtendText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingRange(!isEditingRange)}
                  title="Extend/shrink text range"
                  className="h-5 w-5 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShotClick && onShotClick(shot.id)}
              title="Show in text"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              title="Edit shot"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(shot.id)}
              title="Delete shot"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <div>
              <Label htmlFor={`shot-type-${shot.id}`}>Shot Type</Label>
              <Select
                value={editValues.shotType}
                onValueChange={(value) => setEditValues(prev => ({ ...prev, shotType: value as ShotType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(shotTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={`camera-movement-${shot.id}`}>Camera Movement</Label>
              <Select
                value={editValues.cameraMovement || 'none'}
                onValueChange={(value) => setEditValues(prev => ({ ...prev, cameraMovement: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(cameraMovementLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editValues.cameraMovement && (
              <div>
                <Label htmlFor={`movement-desc-${shot.id}`}>Camera Movement Description</Label>
                <Input
                  id={`movement-desc-${shot.id}`}
                  value={editValues.cameraMovementDescription}
                  onChange={(e) => setEditValues(prev => ({ ...prev, cameraMovementDescription: e.target.value }))}
                  placeholder="Describe the camera movement..."
                />
              </div>
            )}

            <div>
              <Label htmlFor={`description-${shot.id}`}>Description</Label>
              <Textarea
                id={`description-${shot.id}`}
                value={editValues.userDescription}
                onChange={(e) => setEditValues(prev => ({ ...prev, userDescription: e.target.value }))}
                placeholder="Describe what's visible in this shot..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm px-2 py-1 rounded-full ${shotTypeColors[shot.shotType]}`}>
                  {shotTypeLabels[shot.shotType]}
                </span>
                {shot.cameraMovement && (
                  <span className="text-xs text-muted-foreground">
                    • {cameraMovementLabels[shot.cameraMovement as CameraMovement]}
                    {shot.cameraMovementDescription && `: ${shot.cameraMovementDescription}`}
                  </span>
                )}
              </div>
              <Select
                value={shot.cameraMovement || 'none'}
                onValueChange={(value) => onUpdate(shot.id, { cameraMovement: value === 'none' ? undefined : (value as CameraMovement) })}
              >
                <SelectTrigger className="w-20 h-5 text-xs">
                  <SelectValue placeholder="Motion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(cameraMovementLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEditingRange && onExtendText && (
              <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtendStart('expand')}
                    title="Extend start backward"
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs">Start</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtendStart('shrink')}
                    title="Shrink start forward"
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtendEnd('shrink')}
                    title="Shrink end backward"
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs">End</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtendEnd('expand')}
                    title="Extend end forward"
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div 
              className="text-xs bg-muted/50 p-1.5 rounded cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => setIsSourceCollapsed(!isSourceCollapsed)}
            >
              <div className="flex items-start gap-1">
                {(globalCollapsed && isSourceCollapsed) ? <ChevronRight className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" /> : <ChevronDown className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />}
                <span className={`${(globalCollapsed && isSourceCollapsed) ? 'line-clamp-1' : ''}`}>
                  {(globalCollapsed && isSourceCollapsed) 
                    ? (shot.sourceText.length > 80 ? `${shot.sourceText.slice(0, 80)}...` : shot.sourceText)
                    : shot.sourceText
                  }
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                  className="h-4 w-auto p-0 flex items-center gap-1"
                >
                  {(globalCollapsed && isDescriptionCollapsed) ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                  <span className="text-xs font-medium">Description:</span>
                </Button>
                {!(globalCollapsed && isDescriptionCollapsed) && !shot.generatedDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onGenerateDescription(shot.id)}
                    disabled={isGenerating}
                    title="Generate AI description"
                    className="h-4 w-4 p-0"
                  >
                    <RotateCcw className={`h-2.5 w-2.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {!(globalCollapsed && isDescriptionCollapsed) && !isEditingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTempDescription(displayDescription);
                      setIsEditingDescription(true);
                    }}
                    title="Edit description"
                    className="h-4 w-4 p-0"
                  >
                    <Edit className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
              
              {!(globalCollapsed && isDescriptionCollapsed) && (
                <div className="space-y-0.5">
                  {isEditingDescription ? (
                    <div className="space-y-1">
                      <Textarea
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        placeholder="Describe what's visible in this shot..."
                        rows={3}
                        className="text-xs"
                      />
                      <div className="flex gap-1">
                        <Button onClick={handleDescriptionSave} size="sm" className="h-5 text-xs px-2">
                          Save
                        </Button>
                        <Button onClick={handleDescriptionCancel} variant="outline" size="sm" className="h-5 text-xs px-2">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {isGenerating ? 'Generating description...' : displayDescription}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        
          {/* Image Management Section - Only in storyboard mode */}
          {storyboardMode && (
            <div className="lg:border-l lg:pl-4 lg:w-80">
              <ShotImageSection
                shot={shot}
                shotNumber={index + 1}
                allShots={allShots}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};