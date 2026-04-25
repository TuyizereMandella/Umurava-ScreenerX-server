import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { NotificationService } from './notification.service';
import { InterviewService } from './interview.service';
import { AuditService } from './audit.service';
import { GeminiService } from './gemini.service';
import { AiOrchestrator } from './ai_orchestrator.service';

export interface CreateApplicantDTO {
  jobId: string;
  name: string;
  email: string;
  resumeUrl?: string;
  fileBuffer?: Buffer;
  fileMimeType?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  answers?: any;
}

export class ApplicantService {

  /**
   * Uploads a resume file buffer to Supabase Storage and returns the public URL.
   */
  static async uploadResumeToStorage(fileBuffer: Buffer, mimeType: string, jobId: string, email: string): Promise<string | null> {
    try {
      const ext = mimeType.includes('pdf') ? 'pdf' : 'docx';
      const safeEmail = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${jobId}/${safeEmail}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.error('Failed to upload resume to storage:', error.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Resume storage upload failed:', err);
      return null;
    }
  }

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

    // 2. Upload resume to Supabase Storage if a file buffer was provided
    let resolvedResumeUrl = data.resumeUrl || null;
    if (data.fileBuffer && data.fileMimeType) {
      resolvedResumeUrl = await ApplicantService.uploadResumeToStorage(
        data.fileBuffer, data.fileMimeType, job.id, data.email
      );
    }

    // 3. Insert Applicant
    const { data: newApplicant, error: applicantError } = await supabase
      .from('applicants')
      .insert([
        {
          job_id: job.id,
          name: data.name,
          email: data.email,
          resume_url: resolvedResumeUrl,
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
        jobs!inner(id, title, department, organization_id, shortlist_threshold),
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
        jobs!inner(organization_id, title, department, shortlist_threshold),
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
      .select('id, name, jobs!inner(organization_id)')
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

    // Log Activity
    await AuditService.logActivity({
      organizationId,
      actionType: 'AI Candidate Removed',
      description: `Applicant ${applicant.name} was removed from the talent pool.`,
    });

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

    // Fetch applicant to get name, answers, job details, resume_url, threshold, and knockout_skills
    const { data: applicantInfo } = await supabase
      .from('applicants')
      .select('name, answers, resume_url, jobs(organization_id, title, shortlist_threshold, knockout_skills)')
      .eq('id', applicantId)
      .single();

    if (!applicantInfo || !applicantInfo.jobs) {
      throw new AppError('Applicant or Job not found for analysis', 404);
    }
    
    const organizationId = (applicantInfo.jobs as any).organization_id;
    const threshold = (applicantInfo.jobs as any).shortlist_threshold || 70;
    const knockoutSkills = (applicantInfo.jobs as any).knockout_skills || [];

    // Call AI Orchestrator for multi-model analysis with failover
    const aiResult = await AiOrchestrator.analyzeResume(organizationId, {
      name: applicantInfo.name, 
      jobTitle: (applicantInfo.jobs as any).title, 
      skills: [], 
      answers: applicantInfo.answers as Record<string, string>,
      resumeUrl: applicantInfo.resume_url || undefined,
      knockoutSkills
    });

    const analysisPayload = {
      applicant_id: applicantId,
      technical_dna: aiResult.technical_dna,
      algorithmic_fit_score: aiResult.algorithmic_fit_score,
      architecture_score: aiResult.architecture_score,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      recommendation_summary: aiResult.recommendation_summary,
      experience: aiResult.experience || [],
      education: aiResult.education || []
    };

    const { data, error } = await supabase
      .from('ai_analysis')
      .insert([analysisPayload])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to generate analysis: ${error.message}`, 500);
    }
    
    // ---- Deep Multi-Factor Shortlisting Decision ----
    const matchScore = aiResult.match_score ?? 0;
    const fitScore = aiResult.algorithmic_fit_score ?? 0;
    const archScore = aiResult.architecture_score ?? 0;
    const overallScore = matchScore;
    const gaps: string[] = aiResult.gaps || [];
    const isKnockedOut = aiResult.is_knocked_out === true;

    // A candidate is SHORTLISTED if they pass the job's specific threshold AND are not knocked out
    const isShortlisted = !isKnockedOut && overallScore >= threshold && fitScore >= (threshold - 10) && archScore >= (threshold - 15);
    // A candidate is REJECTED if they are knocked out OR score critically low
    const isRejected = isKnockedOut || overallScore < (threshold - 30) || (overallScore < threshold && gaps.length >= 3);

    let newStatus: 'SHORTLISTED' | 'REJECTED' | 'NEW' = 'NEW';
    if (isShortlisted) newStatus = 'SHORTLISTED';
    else if (isRejected) newStatus = 'REJECTED';

    // Update applicant status based on AI decision
    await supabase.from('applicants').update({ match_score: matchScore, status: newStatus }).eq('id', applicantId);

    if (applicantInfo && applicantInfo.jobs) {
      await NotificationService.createNotification({
        organizationId,
        type: newStatus === 'SHORTLISTED' ? 'success' : newStatus === 'REJECTED' ? 'warning' : 'info',
        title: newStatus === 'SHORTLISTED' ? 'Candidate Shortlisted 🎯' : newStatus === 'REJECTED' ? 'Candidate Rejected' : 'AI Screening Completed',
        message: newStatus === 'SHORTLISTED'
          ? `${applicantInfo.name} scored ${matchScore}% and has been automatically shortlisted.`
          : newStatus === 'REJECTED'
          ? `${applicantInfo.name} scored ${matchScore}% and did not meet the shortlisting threshold.`
          : `Analysis finished for ${applicantInfo.name}. Score: ${matchScore}%. Manual review recommended.`,
      });

      await AuditService.logActivity({
        organizationId,
        actionType: `AI Screening → ${newStatus}`,
        description: `ScreenerX AI evaluated ${applicantInfo.name} (Score: ${matchScore}%, Algo: ${fitScore}%, Arch: ${archScore}%). Decision: ${newStatus}`,
      });

      // Auto-schedule interview only for shortlisted candidates
      if (newStatus === 'SHORTLISTED') {
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
          let searchDate = new Date();
          searchDate.setDate(searchDate.getDate() + 2); // Start looking at T+2 days
          let foundDate = '';
          let startTime = '10:00:00';
          let endTime = '10:45:00';
          let attempts = 0;

          while (!foundDate && attempts < 30) { // Safety cap of 30 days
            const checkDateStr = searchDate.toISOString().split('T')[0];
            
            // Query interviews for this organization on this date
            const { data: dailyInterviews } = await supabase
              .from('interviews')
              .select('id, start_time, applicants!inner(jobs!inner(organization_id))')
              .eq('scheduled_date', checkDateStr)
              .eq('applicants.jobs.organization_id', organizationId);

            if (!dailyInterviews || dailyInterviews.length === 0) {
              foundDate = checkDateStr;
              startTime = '10:00:00';
              endTime = '10:45:00';
            } else if (dailyInterviews.length === 1) {
              foundDate = checkDateStr;
              // Staggered time: If first is early, pick afternoon, or vice versa
              const firstTime = dailyInterviews[0].start_time;
              if (firstTime.startsWith('10:')) {
                startTime = '14:00:00'; // 2 PM
                endTime = '14:45:00';
              } else {
                startTime = '10:00:00'; // 10 AM
                endTime = '10:45:00';
              }
            } else {
              // Day is full (2+ interviews), move to next day
              searchDate.setDate(searchDate.getDate() + 1);
              attempts++;
            }
          }

          if (foundDate) {
            await InterviewService.scheduleInterview(organizationId, null, {
              applicantId,
              interviewTypeId,
              scheduledDate: foundDate,
              startTime,
              endTime,
              meetUrl: 'TBD' // Set to TBD so recruiter knows to update it
            });

            await NotificationService.createNotification({
              organizationId,
              type: 'calendar',
              title: 'AI Auto-Scheduled Interview',
              message: `An interview was automatically scheduled for ${applicantInfo.name} on ${foundDate} at ${startTime}.`,
            });
          }
        }
      }
    }

    return data;
  }

  /**
   * Manually update the status of an applicant (e.g. remove from shortlist).
   */
  static async updateApplicantStatus(organizationId: string, applicantId: string, status: string) {
    const validStatuses = ['NEW', 'SHORTLISTED', 'INTERVIEWING', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Verify ownership
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
      .update({ status })
      .eq('id', applicantId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update applicant status: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Automatically creates an applicant and runs analysis from an uploaded CV.
   */
  static async importFromResume(organizationId: string, jobId: string, fileBuffer: Buffer, mimeType: string, resumeUrl?: string) {
    // 1. Get Job Info and Threshold
    const { data: job } = await supabase
      .from('jobs')
      .select('title, shortlist_threshold, knockout_skills')
      .eq('id', jobId)
      .single();

    if (!job) throw new AppError('Job not found', 404);
    const threshold = job.shortlist_threshold || 70;
    const knockoutSkills = job.knockout_skills || [];

    // 2. AI Parse & Analyze via Orchestrator
    const aiResult = await AiOrchestrator.parseAndAnalyze(organizationId, {
      jobTitle: job.title,
      fileBuffer,
      mimeType,
      knockoutSkills
    });
    const personal_details = aiResult?.personal_details || {};
    const analysis = aiResult?.analysis || {};

    if (!personal_details.name || !personal_details.email) {
      throw new AppError('AI failed to extract basic contact info (name/email) from the document.', 422);
    }

    // 3. Upload resume file to Supabase Storage
    const storedResumeUrl = await ApplicantService.uploadResumeToStorage(
      fileBuffer, mimeType, jobId, personal_details.email
    );

    // 4. Create Applicant
    const { data: applicant, error: appError } = await supabase
      .from('applicants')
      .insert([{
        job_id: jobId,
        name: personal_details.name,
        email: personal_details.email,
        phone: personal_details.phone || null,
        location: personal_details.location || null,
        linkedin_url: personal_details.linkedin_url || null,
        github_url: personal_details.github_url || null,
        resume_url: storedResumeUrl || resumeUrl || null,
        status: 'NEW'
      }])
      .select()
      .single();

    if (appError) {
      if (appError.code === '23505') throw new AppError(`Candidate with email ${personal_details.email} already exists for this job.`, 409);
      throw new AppError(`Failed to create applicant: ${appError.message}`, 500);
    }

    // 4. Save Analysis
    const analysisPayload = {
      applicant_id: applicant.id,
      technical_dna: analysis.technical_dna || [],
      algorithmic_fit_score: analysis.algorithmic_fit_score || 0,
      architecture_score: analysis.architecture_score || 0,
      strengths: analysis.strengths || [],
      gaps: analysis.gaps || [],
      recommendation_summary: analysis.recommendation_summary || 'No summary provided',
      experience: analysis.experience || [],
      education: analysis.education || []
    };

    const { error: analysisError } = await supabase.from('ai_analysis').insert([analysisPayload]);
    if (analysisError) {
      console.error('Failed to insert AI analysis:', analysisError);
    }

    // 5. Shortlisting Logic (Respecting custom job threshold)
    const matchScore = analysis.match_score ?? 0;
    const fitScore = analysis.algorithmic_fit_score ?? 0;
    const archScore = analysis.architecture_score ?? 0;
    const isKnockedOut = analysis.is_knocked_out === true;
    const gaps = analysis.gaps || [];

    const isShortlisted = !isKnockedOut && matchScore >= threshold && fitScore >= (threshold - 10) && archScore >= (threshold - 15);
    const isRejected = isKnockedOut || matchScore < (threshold - 30) || (matchScore < threshold && gaps.length >= 3);

    let newStatus: 'SHORTLISTED' | 'REJECTED' | 'NEW' = 'NEW';
    if (isShortlisted) newStatus = 'SHORTLISTED';
    else if (isRejected) newStatus = 'REJECTED';

    await supabase.from('applicants').update({ match_score: matchScore, status: newStatus }).eq('id', applicant.id);

    // 6. Notifications & Audit
    await NotificationService.createNotification({
      organizationId,
      type: newStatus === 'SHORTLISTED' ? 'success' : 'info',
      title: 'Import Complete',
      message: `${personal_details.name} was imported and automatically ${newStatus.toLowerCase()}.`,
    });

    await AuditService.logActivity({
      organizationId,
      actionType: 'AI Candidate Imported',
      description: `Imported and evaluated ${personal_details.name} for ${job.title} (Score: ${matchScore}%)`,
    });

    // 7. Auto-Schedule if Shortlisted
    if (newStatus === 'SHORTLISTED') {
      // Logic from triggerAnalysis could be refactored into a reusable method, 
      // but for now we keep it simple or re-trigger the scheduler logic.
    }

    return { applicant, analysis: analysisPayload };
  }
}
