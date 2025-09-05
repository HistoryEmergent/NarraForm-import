import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shot } from '@/types/shot';
import { useShotImages } from '@/hooks/useShotImages';
import { Upload, Wand2, X, GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShotImageSidebarProps {
  shot: Shot | null;
  onClose: () => void;
}

export const ShotImageSidebar: React.FC<ShotImageSidebarProps> = ({
  shot,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    images,
    loading: imagesLoading,
    generating: imageGenerating,
    loadImages,
    uploadImage,
    generateImageForShot,
    deleteImage,
    reorderImages
  } = useShotImages(shot?.id || '');

  React.useEffect(() => {
    if (shot) {
      loadImages();
    }
  }, [shot, loadImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !shot) return;

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

  const handleGenerateImage = async () => {
    if (!shot) return;
    
    const prompt = `${shot.userDescription || shot.generatedDescription || shot.sourceText}. Shot type: ${shot.shotType}${shot.cameraMovement ? `, Camera movement: ${shot.cameraMovement}` : ''}`;
    
    try {
      await generateImageForShot(prompt, shot.projectId);
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  if (!shot) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Storyboard Images
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a shot to view its images</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Shot Images
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {shot.shotType}
          {shot.cameraMovement && (
            <span className="ml-2">• {shot.cameraMovement}</span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={imagesLoading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateImage}
            disabled={imageGenerating || imagesLoading}
            className="flex-1"
          >
            <Wand2 className={`h-4 w-4 mr-2 ${imageGenerating ? 'animate-spin' : ''}`} />
            Generate
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Image gallery */}
        <div className="flex-1 overflow-auto">
          {imagesLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
              <p className="text-sm text-muted-foreground">No images yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((image, index) => (
                <div key={image.id} className="group relative">
                  <div className="relative bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={`Shot image ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {image.imageType}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteImage(image.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {image.promptUsed && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Prompt:</strong> {image.promptUsed}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shot description */}
        <div className="mt-auto pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            {shot.userDescription || shot.generatedDescription || shot.sourceText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};