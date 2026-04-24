import { Router } from 'express';
import { getAiInsight } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/insight', getAiInsight);

export default router;
