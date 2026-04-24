import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

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
      .select('*', { count: 'exact', head: true })
      .eq('jobs.organization_id', organizationId);

    const jobTitle = jobs && jobs.length > 0 ? jobs[0].title : 'your roles';
    
    // Mocking AI "thinking" based on real counts
    const insights = [
      `Candidates for '${jobTitle}' are showing strong proficiency in modern frameworks. Consider shortening the technical round to increase conversion.`,
      `We noticed a 15% uptick in applications for '${jobTitle}' this week. The market supply for this role is currently high.`,
      `Your '${jobTitle}' pipeline has ${totalApplicants || 0} candidates. AI analysis suggests 3 of them are 'Ready for Technical Interview'.`,
      `High-performing candidates for '${jobTitle}' are frequently mentioning 'remote flexibility' in their resumes. Consider highlighting this more.`
    ];

    const randomInsight = insights[Math.floor(Math.random() * insights.length)];

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
