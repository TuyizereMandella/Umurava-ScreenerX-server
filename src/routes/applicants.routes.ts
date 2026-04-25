import { Router } from 'express';
import { submitApplication, getAllApplicants, getApplicant, analyzeApplicant, deleteApplicant, updateApplicantStatus, importApplicant } from '../controllers/applicant.controller';
import { requireAuth } from '../middleware/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Public route for candidates
router.post('/ingest', submitApplication);

// Protected routes for HR
router.use(requireAuth);

router.get('/', getAllApplicants);
router.post('/import', upload.single('resume'), importApplicant);
router.get('/:id', getApplicant);
router.delete('/:id', deleteApplicant);
router.patch('/:id/status', updateApplicantStatus);
router.post('/:id/analyze', analyzeApplicant);

export default router;
