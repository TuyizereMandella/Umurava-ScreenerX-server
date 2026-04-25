import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { GeminiService } from '../services/gemini.service';

export const getAiInsight = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;

    // Fetch some data to make the insight "real"
    const { data: jobs } = await supabase
      .from('jobs')
      .select('title')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .limit(1);

    const { count: totalApplicants } = await supabase
      .from('applicants')
      .select('id, jobs!inner(organization_id)', { count: 'exact', head: true })
      .eq('jobs.organization_id', organizationId);

    const jobTitle = jobs && jobs.length > 0 ? jobs[0].title : 'your roles';
    
    const orgContext = {
      jobCount: jobs ? jobs.length : 0,
      totalApplicants: totalApplicants || 0,
      topJobTitle: jobTitle
    };

    const randomInsight = await GeminiService.generateDashboardInsight(orgContext);

    res.status(200).json({
      status: 'success',
      data: {
        insight: randomInsight
      }
    });
  } catch (error) {
    next(error);
  }
};
