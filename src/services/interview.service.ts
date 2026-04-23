import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export interface CreateInterviewTypeDTO {
  name: string;
  durationMinutes: number;
}

export interface ScheduleInterviewDTO {
  applicantId: string;
  interviewTypeId: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  meetUrl?: string;
}

export class InterviewService {
  /**
   * INTERVIEW TYPES
   */
  static async createInterviewType(organizationId: string, data: CreateInterviewTypeDTO) {
    const { data: newType, error } = await supabase
      .from('interview_types')
      .insert([
        {
          organization_id: organizationId,
          name: data.name,
          duration_minutes: data.durationMinutes,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create interview type: ${error.message}`, 500);
    }
    return newType;
  }

  static async getInterviewTypes(organizationId: string) {
    const { data, error } = await supabase
      .from('interview_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch interview types: ${error.message}`, 500);
    }
    return data;
  }

  /**
   * INTERVIEWS (SCHEDULING)
   */
  static async scheduleInterview(organizationId: string, userId: string, data: ScheduleInterviewDTO) {
    // 1. Verify Applicant belongs to Organization
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('id, jobs!inner(organization_id)')
      .eq('id', data.applicantId)
      .eq('jobs.organization_id', organizationId)
      .single();

    if (applicantError || !applicant) {
      throw new AppError('Applicant not found or unauthorized', 404);
    }

    // 2. Schedule Interview
    const { data: newInterview, error: interviewError } = await supabase
      .from('interviews')
      .insert([
        {
          applicant_id: data.applicantId,
          interview_type_id: data.interviewTypeId,
          scheduled_date: data.scheduledDate,
          start_time: data.startTime,
          end_time: data.endTime,
          meet_url: data.meetUrl,
          scheduled_by: 'USER',
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (interviewError) {
      throw new AppError(`Failed to schedule interview: ${interviewError.message}`, 500);
    }

    // 3. Update Applicant Status to INTERVIEWING
    await supabase.from('applicants').update({ status: 'INTERVIEWING' }).eq('id', data.applicantId);

    return newInterview;
  }

  static async getInterviews(organizationId: string) {
    // We join applicants and interview_types, and filter by the applicant's job's organization
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        applicants!inner(name, email, jobs!inner(organization_id)),
        interview_types(name, duration_minutes)
      `)
      .eq('applicants.jobs.organization_id', organizationId)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new AppError(`Failed to fetch interviews: ${error.message}`, 500);
    }
    return data;
  }
}
