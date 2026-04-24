import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all audit routes
router.use(requireAuth);

router.get('/', AuditController.getLogs);

export default router;
