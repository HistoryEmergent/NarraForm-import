import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shot, shotTypeLabels, cameraMovementLabels } from '@/types/shot';
import { useShotImages } from '@/hooks/useShotImages';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ShotGalleryDialogProps {
  shots: Shot[];
  initialShotIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShotGalleryDialog: React.FC<ShotGalleryDialogProps> = ({
  shots,
  initialShotIndex,
  open,
  onOpenChange
}) => {
  const [currentShotIndex, setCurrentShotIndex] = useState(initialShotIndex);
  const currentShot = shots[currentShotIndex];
  
  const { images, loadImages } = useShotImages(currentShot?.id || '');

  const goToPrevious = React.useCallback(() => {
    setCurrentShotIndex((prev) => (prev > 0 ? prev - 1 : shots.length - 1));
  }, [shots.length]);

  const goToNext = React.useCallback(() => {
    setCurrentShotIndex((prev) => (prev < shots.length - 1 ? prev + 1 : 0));
  }, [shots.length]);

  React.useEffect(() => {
    if (currentShot) {
      loadImages();
    }
  }, [currentShot, loadImages]);

  React.useEffect(() => {
    setCurrentShotIndex(initialShotIndex);
  }, [initialShotIndex]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, goToPrevious, goToNext, onOpenChange]);

  if (!currentShot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Shot Gallery - Shot {currentShotIndex + 1} of {shots.length}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pt-2 h-full">
            {/* Images Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Shot Images
                </h3>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevious}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {images.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center h-40">
                      <p className="text-sm text-muted-foreground">No images for this shot</p>
                    </CardContent>
                  </Card>
                ) : (
                  images.map((image, index) => (
                    <Card key={image.id}>
                      <CardContent className="p-4">
                        <div className="relative">
                          <img
                            src={image.imageUrl}
                            alt={`Shot ${currentShotIndex + 1} image ${index + 1}`}
                            className="w-full h-auto max-h-80 object-contain rounded-lg"
                          />
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-xs"
                          >
                            {index + 1}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Shot Details Section */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {shotTypeLabels[currentShot.shotType]}
                  </Badge>
                  {currentShot.cameraMovement && (
                    <Badge variant="secondary" className="text-xs">
                      {cameraMovementLabels[currentShot.cameraMovement]}
                    </Badge>
                  )}
                </div>

                {currentShot.cameraMovementDescription && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-2">Camera Movement</h4>
                      <p className="text-sm text-muted-foreground">
                        {currentShot.cameraMovementDescription}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-2">Source Text</h4>
                    <p className="text-sm leading-relaxed">
                      {currentShot.sourceText}
                    </p>
                  </CardContent>
                </Card>

                {currentShot.generatedDescription && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-2">Generated Description</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {currentShot.generatedDescription}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {currentShot.userDescription && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-2">User Description</h4>
                      <p className="text-sm leading-relaxed">
                        {currentShot.userDescription}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};