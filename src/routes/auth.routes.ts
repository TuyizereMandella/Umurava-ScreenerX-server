import { Router } from 'express';
import { signup, login, changePassword } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/change-password', requireAuth, changePassword);

// Example of a protected route
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

export default router;
