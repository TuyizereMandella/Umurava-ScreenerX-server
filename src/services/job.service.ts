import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export interface CreateJobDTO {
  title: string;
  department?: string;
  location?: string;
  priority?: 'HIGH' | 'REGULAR';
  is_public?: boolean;
}

export class JobService {
  /**
   * Retrieves all non-deleted jobs for a specific organization.
   */
  static async getAllJobs(organizationId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        applicants:applicants(count)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch jobs: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Creates a new job posting for an organization.
   */
  static async createJob(organizationId: string, userId: string, data: CreateJobDTO) {
    // Generate a unique public code (e.g., SX-XXXX)
    const publicCode = `SX-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Generate a unique public URL slug
    const publicUrlSlug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert([
        {
          organization_id: organizationId,
          title: data.title,
          department: data.department,
          location: data.location,
          priority: data.priority || 'REGULAR',
          is_public: data.is_public !== undefined ? data.is_public : true,
          public_code: publicCode,
          public_url: publicUrlSlug,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create job: ${error.message}`, 500);
    }

    return newJob;
  }

  /**
   * Fetches a single job by ID, ensuring it belongs to the organization.
   */
  static async getJobById(organizationId: string, jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Job not found', 404);
      }
      throw new AppError(`Failed to fetch job: ${error.message}`, 500);
    }

    return data;
  }
}
