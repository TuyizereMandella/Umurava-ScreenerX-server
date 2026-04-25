import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { AppError } from '../utils/AppError';

export const createInterviewType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, durationMinutes } = req.body;

    if (!name || !durationMinutes) {
      return next(new AppError('Name and duration are required.', 400));
    }

    const interviewType = await InterviewService.createInterviewType(organizationId, { name, durationMinutes });

    res.status(201).json({
      status: 'success',
      data: {
        interviewType,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInterviewTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const interviewTypes = await InterviewService.getInterviewTypes(organizationId);

    res.status(200).json({
      status: 'success',
      results: interviewTypes.length,
      data: {
        types: interviewTypes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const scheduleInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const { applicantId, interviewTypeId, scheduledDate, startTime, endTime, meetUrl } = req.body;

    if (!applicantId || !interviewTypeId || !scheduledDate || !startTime || !endTime) {
      return next(new AppError('Missing required scheduling parameters.', 400));
    }

    const interview = await InterviewService.scheduleInterview(organizationId, userId, {
      applicantId,
      interviewTypeId,
      scheduledDate,
      startTime,
      endTime,
      meetUrl,
    });

    res.status(201).json({
      status: 'success',
      message: 'Interview scheduled successfully',
      data: {
        interview,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInterviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const interviews = await InterviewService.getInterviews(organizationId);

    res.status(200).json({
      status: 'success',
      results: interviews.length,
      data: {
        interviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const interviewId = req.params.id as string;
    const { meetUrl, scheduledDate, startTime, endTime } = req.body;

    const updatedInterview = await InterviewService.updateInterview(organizationId, interviewId, userId, {
      meetUrl,
      scheduledDate,
      startTime,
      endTime
    });

    res.status(200).json({
      status: 'success',
      message: 'Interview updated successfully',
      data: {
        interview: updatedInterview,
      },
    });
  } catch (error) {
    next(error);
  }
};
