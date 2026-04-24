import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../utils/AppError';

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Unauthorized', 401);
      }

      const notifications = await NotificationService.getNotifications(organizationId);

      res.status(200).json({
        status: 'success',
        data: {
          notifications,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
      });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new AppError('Unauthorized', 401);
      }

      const notification = await NotificationService.markAsRead(id as string, organizationId);

      res.status(200).json({
        status: 'success',
        data: {
          notification,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
      });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        throw new AppError('Unauthorized', 401);
      }

      const notifications = await NotificationService.markAllAsRead(organizationId);

      res.status(200).json({
        status: 'success',
        data: {
          notifications,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
      });
    }
  }
}
