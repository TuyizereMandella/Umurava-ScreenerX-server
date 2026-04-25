import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { AppError } from '../utils/AppError';

export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const jobs = await JobService.getAllJobs(organizationId);

    // Format the response to match frontend expectations
    const formattedJobs = jobs.map(job => ({
      ...job,
      applicant_count: job.applicants[0]?.count || 0
    }));

    res.status(200).json({
      status: 'success',
      results: formattedJobs.length,
      data: {
        jobs: formattedJobs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    
    const { title, department, location, priority, deadline, is_public } = req.body;

    if (!title) {
      return next(new AppError('Job title is required', 400));
    }

    const newJob = await JobService.createJob(organizationId, userId, {
      title,
      department,
      location,
      priority,
      deadline,
      is_public
    });

    res.status(201).json({
      status: 'success',
      data: {
        job: newJob,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;

    const job = await JobService.getJobById(organizationId, id);

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const generateBaseline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;
    if (!title) {
      return next(new AppError('Job title is required', 400));
    }

    const baseline = await JobService.generateAiBaseline(title);

    res.status(200).json({
      status: 'success',
      data: {
        baseline,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const job = await JobService.getPublicJobById(id);

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId;

    if (!userId || !organizationId) {
      return next(new AppError('Unauthorized', 401));
    }

    const job = await JobService.deleteJob(organizationId, id);

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const job = await JobService.updateJob(organizationId, id, req.body);

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};
