import { Router } from 'express';
import authRoutes from './auth.routes';
import jobRoutes from './jobs.routes';
import applicantRoutes from './applicants.routes';
import interviewRoutes from './interviews.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applicants', applicantRoutes);
router.use('/interviews', interviewRoutes);

export default router;
