import { Router } from 'express';
import { getAllJobs, createJob, getJob, generateBaseline } from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all job routes
router.use(requireAuth);

router.post('/generate-baseline', generateBaseline);

router.route('/')
  .get(getAllJobs)
  .post(createJob);

router.route('/:id')
  .get(getJob);

export default router;
