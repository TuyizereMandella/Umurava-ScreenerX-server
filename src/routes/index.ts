import { Router } from 'express';
import authRoutes from './auth.routes';
import jobRoutes from './jobs.routes';
import applicantRoutes from './applicants.routes';
import interviewRoutes from './interviews.routes';
import notificationRoutes from './notification.routes';
import auditRoutes from './audit.routes';
import dashboardRoutes from './dashboard.routes';
import emailRoutes from './email.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applicants', applicantRoutes);
router.use('/interviews', interviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit', auditRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/emails', emailRoutes);

export default router;
