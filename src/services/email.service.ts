import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export interface LogEmailDTO {
  organizationId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentByAi?: boolean;
  userId?: string;
}

export class EmailService {
  /**
   * Logs a sent email to the database.
   */
  static async logEmail(data: LogEmailDTO) {
    const { error } = await supabase
      .from('email_logs')
      .insert([
        {
          organization_id: data.organizationId,
          recipient_email: data.recipientEmail,
          subject: data.subject,
          body: data.body,
          sent_by_ai: data.sentByAi || false,
          user_id: data.userId,
          status: 'SENT'
        },
      ]);

    if (error) {
      console.error('Failed to log email:', error);
      // We don't throw here to avoid breaking the main flow if logging fails
    }
  }

  /**
   * Retrieves all email logs for an organization.
   */
  static async getAllEmailLogs(organizationId: string) {
    const { data, error } = await supabase
      .from('email_logs')
      .select(`
        *,
        user:users(full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch email logs: ${error.message}`, 500);
    }

    return data;
  }
}
