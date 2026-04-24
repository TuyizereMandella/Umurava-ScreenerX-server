import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { NotificationService } from './notification.service';
import { InterviewService } from './interview.service';
import { AuditService } from './audit.service';

export interface CreateApplicantDTO {
  jobId: string;
  name: string;
  email: string;
  resumeUrl?: string;
}

export class ApplicantService {
  /**
   * Public endpoint to submit a new application.
   */
  static async ingestApplicant(data: CreateApplicantDTO) {
    // 1. Verify Job exists and is public
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id, title')
      .eq('id', data.jobId)
      .eq('is_public', true)
      .is('deleted_at', null)
      .single();

    if (jobError || !job) {
      throw new AppError('Job not found or is no longer accepting applications.', 404);
    }

    // 2. Insert Applicant
    const { data: newApplicant, error: applicantError } = await supabase
      .from('applicants')
      .insert([
        {
          job_id: job.id,
          name: data.name,
          email: data.email,
          resume_url: data.resumeUrl,
          status: 'NEW',
        },
      ])
      .select()
      .single();

    if (applicantError) {
      if (applicantError.code === '23505') { // Postgres unique violation
        throw new AppError('You have already applied for this position.', 409);
      }
      throw new AppError(`Failed to submit application: ${applicantError.message}`, 500);
    }

    // 3. Create Notification
    await NotificationService.createNotification({
      organizationId: job.organization_id,
      type: 'info',
      title: 'New Applicant',
      message: `${data.name} applied for the position.`,
    });

    // 4. Log Activity
    await AuditService.logActivity({
      organizationId: job.organization_id,
      actionType: 'Candidate Applied',
      description: `Applicant ${data.name} submitted an application for ${job.title}`,
    });

    return newApplicant;
  }

  /**
   * Retrieves all applicants for a given organization, optionally filtered by job or status.
   */
  static async getApplicants(organizationId: string, filters?: { jobId?: string; status?: string }) {
    let query = supabase
      .from('applicants')
      .select(`
        *,
        jobs!inner(id, title, organization_id),
        ai_analysis(*)
      `)
      .eq('jobs.organization_id', organizationId)
      .is('deleted_at', null)
      .order('applied_at', { ascending: false });

    if (filters?.jobId) {
      query = query.eq('job_id', filters.jobId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(`Failed to fetch applicants: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Retrieves a specific applicant with their AI Analysis insights.
   */
  static async getApplicantDetails(organizationId: string, applicantId: string) {
    const { data, error } = await supabase
      .from('applicants')
      .select(`
        *,
        jobs!inner(organization_id, title),
        ai_analysis(*)
      `)
      .eq('id', applicantId)
      .eq('jobs.organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Applicant not found', 404);
      }
      throw new AppError(`Failed to fetch applicant details: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Triggers the mock AI Analysis for an applicant.
   */
  static async triggerAnalysis(applicantId: string) {
    // In a real scenario, this would call Gemini API and process the resume text.
    // For now, we mock the Gemini response based on the frontend structure.
    
    // Check if analysis already exists
    const { data: existing } = await supabase
      .from('ai_analysis')
      .select('id')
      .eq('applicant_id', applicantId)
      .single();
      
    if (existing) {
       throw new AppError('Analysis already completed for this candidate.', 400);
    }

    const mockAnalysis = {
      applicant_id: applicantId,
      technical_dna: ['React', 'Node.js', 'System Architecture'],
      algorithmic_fit_score: 88,
      architecture_score: 92,
      strengths: ['Strong background in distributed systems', 'Excellent problem-solving skills'],
      gaps: ['Limited experience with Rust'],
      recommendation_summary: 'Highly recommended for the technical team. Good fit.'
    };

    const { data, error } = await supabase
      .from('ai_analysis')
      .insert([mockAnalysis])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to generate analysis: ${error.message}`, 500);
    }
    
    // Update the cached match score on the applicant
    await supabase.from('applicants').update({ match_score: 90 }).eq('id', applicantId);

    // Fetch applicant to get organization_id
    const { data: applicant } = await supabase
      .from('applicants')
      .select('name, jobs(organization_id, title)')
      .eq('id', applicantId)
      .single();

    if (applicant && applicant.jobs) {
      const organizationId = (applicant.jobs as any).organization_id;

      await NotificationService.createNotification({
        organizationId,
        type: 'success',
        title: 'AI Screening Completed',
        message: `Analysis finished for ${applicant.name}. Match score updated.`,
      });

      const matchScore = 90; // Our mocked score

      await AuditService.logActivity({
        organizationId,
        actionType: 'AI Screening Completed',
        description: `ScreenerX AI completed evaluation for ${applicant.name}. Score: ${matchScore}%`,
      });
      if (matchScore >= 85) {
        // Find or create AI Technical Screen type
        let { data: types } = await supabase
          .from('interview_types')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', 'AI Technical Screen')
          .limit(1);

        let interviewTypeId;
        
        if (!types || types.length === 0) {
           const { data: newType } = await supabase
             .from('interview_types')
             .insert([{ organization_id: organizationId, name: 'AI Technical Screen', duration_minutes: 45 }])
             .select()
             .single();
           if (newType) interviewTypeId = newType.id;
        } else {
           interviewTypeId = types[0].id;
        }

        if (interviewTypeId) {
          // Schedule 2 days from now at 10 AM
          const date = new Date();
          date.setDate(date.getDate() + 2);
          const scheduledDate = date.toISOString().split('T')[0];

          await InterviewService.scheduleInterview(organizationId, null, {
             applicantId: applicantId,
             interviewTypeId,
             scheduledDate,
             startTime: '10:00:00',
             endTime: '10:45:00',
             meetUrl: 'https://meet.google.com/ai-screen-mock'
          });

          await NotificationService.createNotification({
            organizationId,
            type: 'calendar',
            title: 'AI Auto-Scheduled Interview',
            message: `An interview was automatically scheduled for ${applicant.name} on ${scheduledDate}.`,
          });
        }
      }
    }

    return data;
  }
}
