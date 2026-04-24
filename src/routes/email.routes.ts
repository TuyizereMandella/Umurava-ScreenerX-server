import { Router } from 'express';
import { getAllEmails } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getAllEmails);

export default router;
