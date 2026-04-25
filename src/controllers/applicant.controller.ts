import { Request, Response, NextFunction } from 'express';
import { ApplicantService } from '../services/applicant.service';
import { AppError } from '../utils/AppError';

export const submitApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, name, email, resumeUrl, phone, location, linkedin_url, github_url } = req.body;
    // answers comes as a JSON string in FormData payloads
    let answers = req.body.answers;
    if (typeof answers === 'string') {
      try { answers = JSON.parse(answers); } catch { answers = {}; }
    }

    if (!jobId || !name || !email) {
      return next(new AppError('Job ID, name, and email are required.', 400));
    }

    const newApplicant = await ApplicantService.ingestApplicant({
      jobId,
      name,
      email,
      resumeUrl,
      fileBuffer: req.file?.buffer,
      fileMimeType: req.file?.mimetype,
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
export const importApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const { jobId } = req.body;
    const file = req.file;

    if (!jobId || !file) {
      return next(new AppError('Job ID and resume file are required.', 400));
    }

    // In a real production app, you would upload the file to Supabase Storage first to get a URL
    // For this implementation, we parse the buffer directly for speed and efficiency
    // We pass null for resumeUrl if we don't have a storage upload implemented here yet
    const result = await ApplicantService.importFromResume(
      organizationId,
      jobId,
      file.buffer,
      file.mimetype,
      undefined // resumeUrl
    );

    res.status(201).json({
      status: 'success',
      message: 'Candidate imported and analyzed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
