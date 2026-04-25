import { Router } from 'express';
import { getDepartments, createDepartment } from '../controllers/department.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all department routes
router.use(requireAuth);

router.route('/')
  .get(getDepartments)
  .post(createDepartment);

export default router;
