import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { StorageService } from '../services/storage.service';

const router = Router();

// Configure multer to store file in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(requireAuth);

router.post('/resume', upload.single('resume'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const resumeUrl = await StorageService.uploadResume(file.buffer, file.originalname, organizationId);

    res.status(200).json({
      status: 'success',
      data: {
        resumeUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
