import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export class StorageService {
  static readonly BUCKET = 'resumes';

  /**
   * Uploads a resume to the 'resumes' Supabase Storage bucket.
   */
  static async uploadResume(fileBuffer: Buffer, originalName: string, organizationId: string, mimeType = 'application/pdf'): Promise<string> {
    try {
      const timestamp = Date.now();
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${organizationId}/${timestamp}-${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from(StorageService.BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw new AppError(`Supabase Storage error: ${error.message}`, 500);
      }

      const { data: publicUrlData } = supabase.storage
        .from(StorageService.BUCKET)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Storage upload failed:', error);
      throw new AppError(error.message || 'Failed to upload resume', 500);
    }
  }
}

