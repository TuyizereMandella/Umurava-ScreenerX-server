import { Router } from 'express';
import { getAllJobs, createJob, getJob, generateBaseline, getPublicJob, deleteJob, updateJob } from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (Must be before requireAuth)
router.get('/public/:id', getPublicJob);

// Protect all other job routes
router.use(requireAuth);

router.post('/generate-baseline', generateBaseline);

router.route('/')
  .get(getAllJobs)
  .post(createJob);

router.route('/:id')
  .get(getJob)
  .patch(updateJob)
  .delete(deleteJob);

export default router;
