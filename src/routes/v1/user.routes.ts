import { Request, Response, Router } from 'express';
import * as userController from '@/controllers/v1/user.controller';
import { validateRequest } from '@/middlewares/validateRequest';
import { updateUserSchema } from '@/validators/v1/user.validator';
import { env } from '@/config/zodSafeEnv';
import { requireAuth } from '@clerk/express';
const router = Router();


// GET /api/v1/users/me
// GET /api/v1/users/me?fields=<field1,field2,field3>
router.get('/me', requireAuth(), userController.getMyProfile);
router.get("/suggestions", requireAuth(), userController.getSuggestions)
router.patch("/suggestions/:id/delete", requireAuth(), userController.handleDelete)

router.get("/following", requireAuth(), userController.getUserFollowing)
router.patch("/following/:toUserId/unfriend", requireAuth(), userController.handleUserUnfriend)
router.get("/sent-requests", requireAuth(), userController.getSentRequests)
router.get("/recieved-requests", requireAuth(), userController.getRecievedRequests)
router.post("/follow-request/:toUserId/send", requireAuth(), userController.handleSendFollowRequest)
router.patch("/follow-request/:fromUserId/accept", requireAuth(), userController.handleAcceptRequest)
router.patch("/follow-request/:toUserId/cancel", requireAuth(), userController.handleCancelFollowRequest)
router.patch("/follow-request/:toUserId/reject", requireAuth(), userController.handleRejectRequest)

// PATCH /api/v1/users/me
router.patch('/me', requireAuth(), validateRequest(updateUserSchema, 'body'), userController.updateUser);

// GET /api/v1/users/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;



// Endpoint : /api/v1/users