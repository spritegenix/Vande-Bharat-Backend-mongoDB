// src/routes/user.routes.ts
import { env } from '@/config/zodSafeEnv';
import { handleClerkUserCreated } from '@/controllers/v1/webhook.controller';
import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/clerk/user-created', handleClerkUserCreated);


router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV });
});

export default router;
