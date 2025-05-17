
import { Router } from 'express';
import { validateRequest } from '@/middlewares/validateRequest';
import { requireAuth } from '@clerk/express';
import { getPresignedUploadUrl } from '@/controllers/v1/media.controller';
import { s3UploadValidator } from '@/validators/v1/media.validators';

const router = Router();

router.post('/upload-url', requireAuth(), validateRequest(s3UploadValidator), getPresignedUploadUrl);

export default router;
