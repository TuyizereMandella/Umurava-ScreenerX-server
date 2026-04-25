import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { Resend } from 'resend';
import { config } from '../config/env';

export interface LogEmailDTO {
  organizationId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentByAi?: boolean;
  userId?: string;
}

export class EmailService {
  private static resend = new Resend(config.resendApiKey);

  /**
   * Sends an email via Resend and logs it to the database.
   */
  static async sendAndLogEmail(data: LogEmailDTO) {
    try {
      if (config.resendApiKey && config.resendApiKey !== 'placeholder-resend-key-replace-me') {
        await this.resend.emails.send({
          from: 'ScreenerX <onboarding@resend.dev>', // Use default Resend test domain
          to: data.recipientEmail,
          subject: data.subject,
          text: data.body,
        });
      } else {
        console.warn('Resend API key not set or is placeholder, skipping real email send.');
      }
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
    }

    // Always log the attempt
    await this.logEmail(data);
  }
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
