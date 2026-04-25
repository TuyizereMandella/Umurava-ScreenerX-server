import { Router } from 'express';
import { submitApplication, getAllApplicants, getApplicant, analyzeApplicant, deleteApplicant, updateApplicantStatus } from '../controllers/applicant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public route for candidates
router.post('/ingest', submitApplication);

// Protected routes for HR
router.use(requireAuth);

router.get('/', getAllApplicants);
router.get('/:id', getApplicant);
router.delete('/:id', deleteApplicant);
router.patch('/:id/status', updateApplicantStatus);
router.post('/:id/analyze', analyzeApplicant);

export default router;
