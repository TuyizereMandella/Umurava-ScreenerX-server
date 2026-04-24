import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export interface CreateNotificationDTO {
  organizationId: string;
  type: 'success' | 'info' | 'warning' | 'calendar';
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Fetch all notifications for an organization
   */
  static async getNotifications(organizationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch notifications: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Create a new notification internally
   */
  static async createNotification(data: CreateNotificationDTO) {
    const { data: newNotification, error } = await supabase
      .from('notifications')
      .insert([
        {
          organization_id: data.organizationId,
          type: data.type,
          title: data.title,
          message: data.message,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      // We don't necessarily throw here to avoid failing the main action (like applicant ingest)
      // just because the notification failed.
      return null;
    }

    return newNotification;
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, organizationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to mark notification as read: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Mark all notifications as read for an organization
   */
  static async markAllAsRead(organizationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', organizationId)
      .eq('is_read', false)
      .select();

    if (error) {
      throw new AppError(`Failed to mark all notifications as read: ${error.message}`, 500);
    }

    return data;
  }
}
