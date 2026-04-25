import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export class StorageService {
  /**
   * Uploads a resume to the 'resumes' Supabase Storage bucket.
   */
  static async uploadResume(fileBuffer: Buffer, originalName: string, organizationId: string): Promise<string> {
    try {
      // Create a unique file path: organizationId/timestamp-filename
      const timestamp = Date.now();
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${organizationId}/${timestamp}-${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw new AppError(`Supabase Storage error: ${error.message}`, 500);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Storage upload failed:', error);
      throw new AppError(error.message || 'Failed to upload resume', 500);
    }
  }
}
