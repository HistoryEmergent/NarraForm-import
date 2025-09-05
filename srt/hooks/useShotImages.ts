import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateImage, ImageGenerationParams } from '@/utils/imageGenerationApi';

export interface ShotImage {
  id: string;
  shotId: string;
  projectId: string;
  imageUrl: string;
  imageType: 'uploaded' | 'generated';
  imageOrder: number;
  promptUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export const useShotImages = (shotId: string) => {
  const [images, setImages] = useState<ShotImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const loadImages = useCallback(async () => {
    if (!shotId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shot_images')
        .select('*')
        .eq('shot_id', shotId)
        .order('image_order', { ascending: true });

      if (error) throw error;

      const formattedImages: ShotImage[] = (data || []).map(img => ({
        id: img.id,
        shotId: img.shot_id,
        projectId: img.project_id,
        imageUrl: img.image_url,
        imageType: img.image_type as 'uploaded' | 'generated',
        imageOrder: img.image_order,
        promptUsed: img.prompt_used || undefined,
        createdAt: img.created_at,
        updatedAt: img.updated_at
      }));

      setImages(formattedImages);
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [shotId, toast]);

  const uploadImage = useCallback(async (file: File, projectId: string) => {
    setLoading(true);
    try {
      // Upload to Supabase storage
      const fileName = `${shotId}-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shot-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('shot-images')
        .getPublicUrl(fileName);

      // Save to database
      const nextOrder = Math.max(0, ...images.map(img => img.imageOrder)) + 1;
      const { data, error } = await supabase
        .from('shot_images')
        .insert([{
          shot_id: shotId,
          project_id: projectId,
          image_url: publicUrl,
          image_type: 'uploaded',
          image_order: nextOrder
        }])
        .select()
        .single();

      if (error) throw error;

      const newImage: ShotImage = {
        id: data.id,
        shotId: data.shot_id,
        projectId: data.project_id,
        imageUrl: data.image_url,
        imageType: data.image_type as 'uploaded' | 'generated',
        imageOrder: data.image_order,
        promptUsed: data.prompt_used || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setImages(prev => [...prev, newImage].sort((a, b) => a.imageOrder - b.imageOrder));

      toast({
        title: "Image uploaded",
        description: "Image has been added to the shot"
      });

      return newImage;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [shotId, images, toast]);

  const generateImageForShot = useCallback(async (
    prompt: string, 
    projectId: string, 
    params?: Partial<ImageGenerationParams>
  ) => {
    setGenerating(true);
    try {
      // Generate image using the image generation API
      const result = await generateImage({
        prompt,
        ...params
      });

      if (!result.success || !result.imageUrl) {
        throw new Error(result.error || 'Failed to generate image');
      }

      // Save to database
      const nextOrder = Math.max(0, ...images.map(img => img.imageOrder)) + 1;
      const { data, error } = await supabase
        .from('shot_images')
        .insert([{
          shot_id: shotId,
          project_id: projectId,
          image_url: result.imageUrl,
          image_type: 'generated',
          image_order: nextOrder,
          prompt_used: prompt
        }])
        .select()
        .single();

      if (error) throw error;

      const newImage: ShotImage = {
        id: data.id,
        shotId: data.shot_id,
        projectId: data.project_id,
        imageUrl: data.image_url,
        imageType: data.image_type as 'uploaded' | 'generated',
        imageOrder: data.image_order,
        promptUsed: data.prompt_used || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setImages(prev => [...prev, newImage].sort((a, b) => a.imageOrder - b.imageOrder));

      toast({
        title: "Image generated",
        description: "AI image has been created for the shot"
      });

      return newImage;
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive"
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  }, [shotId, images, toast]);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      // Delete from storage if it's an uploaded image
      if (image.imageType === 'uploaded') {
        const fileName = image.imageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('shot-images')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('shot_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));

      toast({
        title: "Image deleted",
        description: "Image has been removed from the shot"
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive"
      });
    }
  }, [images, toast]);

  const reorderImages = useCallback(async (imageId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('shot_images')
        .update({ image_order: newOrder })
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => 
        prev.map(img => 
          img.id === imageId ? { ...img, imageOrder: newOrder } : img
        ).sort((a, b) => a.imageOrder - b.imageOrder)
      );
    } catch (error) {
      console.error('Error reordering images:', error);
      toast({
        title: "Error",
        description: "Failed to reorder images",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    images,
    loading,
    generating,
    loadImages,
    uploadImage,
    generateImageForShot,
    deleteImage,
    reorderImages
  };
};