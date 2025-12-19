import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BUCKET_NAME = 'unit-photos';

interface UploadResult {
  url: string;
  path: string;
}

export function useUnitPhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadPhoto = async (file: File, unitId: string): Promise<UploadResult | null> => {
    setUploading(true);
    
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `${unitId}/${timestamp}-${random}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (err) {
      console.error('Upload exception:', err);
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiplePhotos = async (
    files: File[],
    unitId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadResult[]> => {
    setUploading(true);
    const results: UploadResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const result = await uploadPhoto(files[i], unitId);
        if (result) {
          results.push(result);
        }
        onProgress?.(i + 1, files.length);
      }

      if (results.length > 0) {
        toast({
          title: 'Photos uploaded',
          description: `${results.length} of ${files.length} photos uploaded successfully`,
        });
      }

      return results;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: 'Delete failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (err) {
      console.error('Delete exception:', err);
      return false;
    }
  };

  const getPathFromUrl = (url: string): string | null => {
    // Extract path from Supabase storage URL
    const match = url.match(/\/storage\/v1\/object\/public\/unit-photos\/(.+)$/);
    return match ? match[1] : null;
  };

  return {
    uploading,
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    getPathFromUrl,
  };
}
