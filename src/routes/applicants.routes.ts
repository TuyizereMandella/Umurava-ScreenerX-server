import { Router } from 'express';
import { submitApplication, getAllApplicants, getApplicant, analyzeApplicant } from '../controllers/applicant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public route for candidates
router.post('/ingest', submitApplication);

// Protected routes for HR
router.use(requireAuth);

router.get('/', getAllApplicants);
router.get('/:id', getApplicant);
router.post('/:id/analyze', analyzeApplicant);

export default router;
