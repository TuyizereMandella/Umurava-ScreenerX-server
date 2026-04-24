import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AppError } from '../utils/AppError';

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Unauthorized', 401);
      }

      const logs = await AuditService.getLogs(organizationId);

      res.status(200).json({
        status: 'success',
        data: {
          logs,
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
