import { Request, Response, Router } from 'express';
import { requireAuth } from '@clerk/express';
import {
  joinCommunityRequest,
  inviteUserToCommunity,
  getJoinRequests,
  respondToJoinRequest,
  removeCommunityMember,
  cancelJoinRequest,
} from '@/controllers/v1/request.controller';
import { env } from '@/config/zodSafeEnv';

const router = Router();

// POST - user requests to join a community by slug
// POST /api/v1/requests/join-community/:slug
router.post('/join-community/:slug', requireAuth(), joinCommunityRequest);

// POST - community owner/admin invites a user to join via slug
// POST /api/v1/requests/invite/:slug
router.post('/invite/:slug', requireAuth(), inviteUserToCommunity);

// GET - list all join requests for a community (only by owner/admin)
// GET - /api/v1/requests/join-community/:slug/requests
router.get('/join-community/:slug/requests', requireAuth(), getJoinRequests);

// PATCH - owner/admin accepts/rejects a user's join request
router.patch('/join-community/:slug/respond', requireAuth(), respondToJoinRequest);

// DELETE - owner/admin removes a member from the community by slug
router.delete('/remove/:slug', requireAuth(), removeCommunityMember);

// DELETE - user cancels their pending join request to a community
router.delete('/join-community/:slug/cancel', requireAuth(), cancelJoinRequest);


// GET /api/v1/users/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});


export default router;
