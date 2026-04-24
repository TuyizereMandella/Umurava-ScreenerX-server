import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';

export const getAllEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const emails = await EmailService.getAllEmailLogs(organizationId);

    res.status(200).json({
      status: 'success',
      results: emails.length,
      data: {
        emails,
      },
    });
  } catch (error) {
    next(error);
  }
};
