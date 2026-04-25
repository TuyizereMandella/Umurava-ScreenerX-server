import { Request, Response, NextFunction } from 'express';
import { ApplicantService } from '../services/applicant.service';
import { AppError } from '../utils/AppError';

export const submitApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, name, email, resumeUrl, phone, location, linkedin_url, github_url, answers } = req.body;

    if (!jobId || !name || !email) {
      return next(new AppError('Job ID, name, and email are required.', 400));
    }

    const newApplicant = await ApplicantService.ingestApplicant({
      jobId,
      name,
      email,
      resumeUrl,
      phone,
      location,
      linkedin_url,
      github_url,
      answers
    });

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: {
        applicant: newApplicant,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const { jobId, status } = req.query;

    const applicants = await ApplicantService.getApplicants(organizationId, {
      jobId: jobId as string,
      status: status as string,
    });

    res.status(200).json({
      status: 'success',
      results: applicants.length,
      data: {
        applicants,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;

    const applicant = await ApplicantService.getApplicantDetails(organizationId, id);

    res.status(200).json({
      status: 'success',
      data: {
        applicant,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const analyzeApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;

    // Verify ownership first via getApplicantDetails
    await ApplicantService.getApplicantDetails(organizationId, id);
    
    const analysis = await ApplicantService.triggerAnalysis(id);

    res.status(200).json({
      status: 'success',
      message: 'AI Analysis complete',
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;

    await ApplicantService.deleteApplicant(organizationId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateApplicantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    const updated = await ApplicantService.updateApplicantStatus(organizationId, id, status);

    res.status(200).json({
      status: 'success',
      data: { applicant: updated },
    });
  } catch (error) {
    next(error);
  }
};
