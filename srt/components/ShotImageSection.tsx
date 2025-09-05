import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shot } from '@/types/shot';
import { useShotImages } from '@/hooks/useShotImages';
import { Upload, Wand2, GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShotGalleryDialog } from './ShotGalleryDialog';

interface ShotImageSectionProps {
  shot: Shot;
  shotNumber: number;
  allShots: Shot[];
}

export const ShotImageSection: React.FC<ShotImageSectionProps> = ({
  shot,
  shotNumber,
  allShots
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  const {
    images,
    loading: imagesLoading,
    generating: imageGenerating,
    loadImages,
    uploadImage,
    generateImageForShot,
    deleteImage,
    reorderImages
  } = useShotImages(shot.id);

  React.useEffect(() => {
    loadImages();
  }, [shot, loadImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file, shot.projectId);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = () => {
    const shotIndex = allShots.findIndex(s => s.id === shot.id);
    if (shotIndex !== -1) {
      setGalleryOpen(true);
    }
  };

  const handleGenerateImage = async () => {
    const prompt = `${shot.userDescription || shot.generatedDescription || shot.sourceText}. Shot type: ${shot.shotType}${shot.cameraMovement ? `, Camera movement: ${shot.cameraMovement}` : ''}`;
    
    try {
      await generateImageForShot(prompt, shot.projectId);
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Horizontal action buttons */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={imagesLoading}
                className="h-8 w-8 shrink-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Upload image</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleGenerateImage}
                disabled={imageGenerating || imagesLoading}
                className="h-8 w-8 shrink-0"
              >
                <Wand2 className={`h-4 w-4 ${imageGenerating ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Generate AI image</TooltipContent>
          </Tooltip>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Larger images filling available space */}
        {imagesLoading ? (
          <div className="flex items-center justify-center h-20 border border-dashed border-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-muted rounded-lg">
            <p className="text-xs text-muted-foreground">No images</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {images.map((image, index) => (
              <div key={image.id} className="group relative">
                <div 
                  className="relative bg-muted rounded-lg overflow-hidden max-h-32 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleImageClick}
                >
                  <img
                    src={image.imageUrl}
                    alt={`Shot ${shotNumber} image ${index + 1}`}
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="text-xs py-0 px-1">
                      {index + 1}
                    </Badge>
                  </div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteImage(image.id)}
                      className="h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ShotGalleryDialog
        shots={allShots}
        initialShotIndex={allShots.findIndex(s => s.id === shot.id)}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </TooltipProvider>
  );
};