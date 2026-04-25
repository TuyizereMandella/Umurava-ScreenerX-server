import { Router } from 'express';
import { signup, login, changePassword, getMe, getOrgUsers } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/change-password', requireAuth, changePassword);
router.get('/me', requireAuth, getMe);
router.get('/users', requireAuth, getOrgUsers);

export default router;
