import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export interface LogActivityDTO {
  organizationId: string;
  userId?: string | null;
  actionType: string;
  description: string;
}

export class AuditService {
  /**
   * Fetch all audit logs for an organization
   */
  static async getLogs(organizationId: string) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users(full_name)
      `)
      .eq('organization_id', organizationId)
      .or('action_type.ilike.%AI%,action_type.eq.Candidate Applied')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch audit logs: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Log an activity internally
   */
  static async logActivity(data: LogActivityDTO) {
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          organization_id: data.organizationId,
          user_id: data.userId || null,
          action_type: data.actionType,
          description: data.description,
        },
      ]);

    if (error) {
      console.error('Failed to log activity:', error);
      // We don't throw here to avoid failing the main business process
      // just because audit logging failed.
      return false;
    }

    return true;
  }
}
