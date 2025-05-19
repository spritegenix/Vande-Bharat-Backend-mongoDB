import { Request, Response, Router } from 'express';
import * as userController from '@/controllers/v1/user.controller';
import { validateRequest } from '@/middlewares/validateRequest';
import { updateUserSchema } from '@/validators/v1/user.validator';
import { env } from '@/config/zodSafeEnv';
import { requireAuth } from '@clerk/express';
const router = Router();


// GET /api/v1/users/me
router.get('/me', requireAuth(), userController.getMyProfile);

// PATCH /api/v1/users/me
router.patch('/me', requireAuth(), validateRequest(updateUserSchema, 'body'), userController.updateUser);



// GET /api/v1/users/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;



// Endpoint : /api/v1/users