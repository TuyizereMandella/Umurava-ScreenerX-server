import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { NotificationService } from './notification.service';
import { InterviewService } from './interview.service';
import { AuditService } from './audit.service';
import { GeminiService } from './gemini.service';

export interface CreateApplicantDTO {
  jobId: string;
  name: string;
  email: string;
  resumeUrl?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  answers?: any;
}

export class ApplicantService {
  /**
   * Public endpoint to submit a new application.
   */
  static async ingestApplicant(data: CreateApplicantDTO) {
    // 1. Verify Job exists and is public
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id, title, auto_ai_analysis')
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
          phone: data.phone,
          location: data.location,
          linkedin_url: data.linkedin_url,
          github_url: data.github_url,
          answers: data.answers,
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

    // 5. Auto-run AI Analysis if enabled
    if (job.auto_ai_analysis) {
      // Run in background, don't await so we don't block the API response
      ApplicantService.triggerAnalysis(newApplicant.id).catch(err => {
        console.error(`Auto AI Analysis failed for applicant ${newApplicant.id}:`, err);
      });
    }

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
   * Soft deletes a specific applicant.
   */
  static async deleteApplicant(organizationId: string, applicantId: string) {
    // First verify applicant belongs to organization
    const { data: applicant, error: verifyError } = await supabase
      .from('applicants')
      .select('id, jobs!inner(organization_id)')
      .eq('id', applicantId)
      .eq('jobs.organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (verifyError || !applicant) {
      throw new AppError('Applicant not found or unauthorized', 404);
    }

    const { data, error } = await supabase
      .from('applicants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', applicantId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to delete applicant: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Triggers live Gemini AI Analysis for an applicant.
   */
  static async triggerAnalysis(applicantId: string) {
    
    // Check if analysis already exists
    const { data: existing } = await supabase
      .from('ai_analysis')
      .select('id')
      .eq('applicant_id', applicantId)
      .maybeSingle();
      
    if (existing) {
       throw new AppError('Analysis already completed for this candidate.', 400);
    }

    // Fetch applicant to get name, answers, and job details
    const { data: applicantInfo } = await supabase
      .from('applicants')
      .select('name, answers, jobs(organization_id, title)')
      .eq('id', applicantId)
      .single();

    if (!applicantInfo || !applicantInfo.jobs) {
      throw new AppError('Applicant or Job not found for analysis', 404);
    }
    
    const organizationId = (applicantInfo.jobs as any).organization_id;

    // Call real Gemini API
    const aiResult = await GeminiService.analyzeResume(
      applicantInfo.name, 
      (applicantInfo.jobs as any).title, 
      [], // skills could be extracted if we stored them
      applicantInfo.answers
    );

    const analysisPayload = {
      applicant_id: applicantId,
      technical_dna: aiResult.technical_dna,
      algorithmic_fit_score: aiResult.algorithmic_fit_score,
      architecture_score: aiResult.architecture_score,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      recommendation_summary: aiResult.recommendation_summary
    };

    const { data, error } = await supabase
      .from('ai_analysis')
      .insert([analysisPayload])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to generate analysis: ${error.message}`, 500);
    }
    
    const matchScore = aiResult.match_score || 80;
    
    // Update the cached match score on the applicant
    await supabase.from('applicants').update({ match_score: matchScore }).eq('id', applicantId);

    if (applicantInfo && applicantInfo.jobs) {
      await NotificationService.createNotification({
        organizationId,
        type: 'success',
        title: 'AI Screening Completed',
        message: `Analysis finished for ${applicantInfo.name}. Match score updated.`,
      });

      await AuditService.logActivity({
        organizationId,
        actionType: 'AI Screening Completed',
        description: `ScreenerX AI completed evaluation for ${applicantInfo.name}. Score: ${matchScore}%`,
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
            message: `An interview was automatically scheduled for ${applicantInfo.name} on ${scheduledDate}.`,
          });
        }
      }
    }

    return data;
  }
}
