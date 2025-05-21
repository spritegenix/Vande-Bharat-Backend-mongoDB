
import { Request, Response, Router } from 'express';
import { validateRequest } from '@/middlewares/validateRequest';
import { requireAuth } from '@clerk/express';
import { getPresignedUploadUrl } from '@/controllers/v1/media.controller';
import { s3UploadValidator } from '@/validators/v1/media.validators';
import { env } from '@/config/zodSafeEnv';

const router = Router();

// POST /api/v1/media/upload-url
router.post('/upload-url', requireAuth(), validateRequest(s3UploadValidator), getPresignedUploadUrl);

// GET /api/v1/media/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV,  });
});


export default router;
