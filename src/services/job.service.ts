import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { GeminiService } from './gemini.service';

export interface CreateJobDTO {
  title: string;
  department?: string;
  location?: string;
  priority?: 'HIGH' | 'REGULAR';
  deadline?: string;
  is_public?: boolean;
  auto_ai_analysis?: boolean;
  requires_access_code?: boolean;
  ai_baseline?: any;
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
   * Generates a mock AI baseline for a job.
   */
  static async generateAiBaseline(title: string) {
    return await GeminiService.generateJobBaseline(title);
  }

  /**
   * Creates a new job posting for an organization.
   */
  static async createJob(organizationId: string, userId: string, data: CreateJobDTO) {
    // Generate a unique public code (e.g., SX-XXXX)
    const publicCode = `SX-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Generate a unique public URL slug
    const publicUrlSlug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    // Use provided AI Baseline, or generate one if public and missing
    let aiBaseline = data.ai_baseline;
    if (!aiBaseline && data.is_public !== false) {
      aiBaseline = await this.generateAiBaseline(data.title);
    }

    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert([
        {
          organization_id: organizationId,
          title: data.title,
          department: data.department,
          location: data.location,
          priority: data.priority || 'REGULAR',
          deadline: data.deadline || null,
          is_public: data.is_public !== undefined ? data.is_public : true,
          auto_ai_analysis: data.auto_ai_analysis !== undefined ? data.auto_ai_analysis : true,
          requires_access_code: data.requires_access_code !== undefined ? data.requires_access_code : false,
          public_code: publicCode,
          public_url: publicUrlSlug,
          created_by: userId,
          ai_baseline: aiBaseline,
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

  /**
   * Fetches a single job for the public candidate portal.
   * Returns the job regardless of is_public status (so frontend can render the correct closed/lock screen).
   * Omits soft-deleted jobs.
   */
  static async getPublicJobById(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, organizations(name)')
      .eq('id', jobId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Job not found', 404);
      }
      throw new AppError(`Failed to fetch public job: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Soft deletes a job.
   */
  static async deleteJob(organizationId: string, jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Job not found', 404);
      }
      throw new AppError(`Failed to delete job: ${error.message}`, 500);
    }

    return data;
  }
  /**
   * Updates an existing job. Only whitelisted fields can be changed.
   */
  static async updateJob(organizationId: string, jobId: string, data: Partial<CreateJobDTO>) {
    // SECURITY: Explicitly whitelist fields that can be updated.
    // This prevents mass-assignment attacks where a caller could overwrite
    // sensitive fields like organization_id, created_by, ai_baseline, etc.
    const allowedUpdates: Record<string, any> = {};
    if (data.title !== undefined)                 allowedUpdates.title = data.title;
    if (data.department !== undefined)            allowedUpdates.department = data.department;
    if (data.location !== undefined)              allowedUpdates.location = data.location;
    if (data.priority !== undefined)              allowedUpdates.priority = data.priority;
    if (data.deadline !== undefined)              allowedUpdates.deadline = data.deadline;
    if (data.is_public !== undefined)             allowedUpdates.is_public = data.is_public;
    if (data.auto_ai_analysis !== undefined)      allowedUpdates.auto_ai_analysis = data.auto_ai_analysis;
    if (data.requires_access_code !== undefined)  allowedUpdates.requires_access_code = data.requires_access_code;

    if (Object.keys(allowedUpdates).length === 0) {
      throw new AppError('No valid fields provided for update.', 400);
    }

    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update(allowedUpdates)
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Job not found', 404);
      }
      throw new AppError(`Failed to update job: ${error.message}`, 500);
    }

    return updatedJob;
  }
}
