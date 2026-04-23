import { Router } from 'express';
import { getAllJobs, createJob, getJob } from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all job routes
router.use(requireAuth);

router.route('/')
  .get(getAllJobs)
  .post(createJob);

router.route('/:id')
  .get(getJob);

export default router;
