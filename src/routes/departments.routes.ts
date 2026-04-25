import { Router } from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/department.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all department routes
router.use(requireAuth);

router.route('/')
  .get(getDepartments)
  .post(createDepartment);

router.route('/:id')
  .delete(deleteDepartment);

export default router;
