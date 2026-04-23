import { Router } from 'express';
import { 
  createInterviewType, 
  getInterviewTypes, 
  scheduleInterview, 
  getInterviews 
} from '../controllers/interview.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All interview and calendar routes are protected
router.use(requireAuth);

// Interview Types (Archetypes)
router.route('/types')
  .get(getInterviewTypes)
  .post(createInterviewType);

// Scheduled Interviews (Calendar events)
router.route('/')
  .get(getInterviews)
  .post(scheduleInterview);

export default router;
