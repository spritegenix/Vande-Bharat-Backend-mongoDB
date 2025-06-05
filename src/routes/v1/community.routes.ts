import { Router } from 'express';
import { createCommunity, deleteCommunity, fetchCommunityMembers, fetchCommunityPosts, getCommunityProfile, leaveCommunity, toggleCommunityAdmin, updateCommunity } from '@/controllers/v1/community.controller';
import { validateRequest } from '@/middlewares/validateRequest';
import { requireAuth } from '@clerk/express';
import { createCommunitySchema, toggleAdminSchema, updateCommunitySchema } from '@/validators/v1/community.validators';

const router = Router();

// POST /api/v1/communities/create-community
router.post('/create-community', requireAuth(), validateRequest(createCommunitySchema), createCommunity);

// PATCH /api/v1/communities/:communitySlug
router.patch( '/:communitySlug', requireAuth(), validateRequest(updateCommunitySchema), updateCommunity );

// GET /api/v1/communities/:communitySlug?fields=description,banner,followingCount
router.get('/:communitySlug', getCommunityProfile);

// GET /api/v1/communities/:slug/members?limit=10&cursor=user_abcd
router.get('/:slug/members', fetchCommunityMembers);

// DELETE /api/v1/communities/:communitySlug
router.delete('/:communitySlug', requireAuth(), deleteCommunity);

// PATCH /api/v1/communities/:slug/toggle-member-promotion
router.patch( '/:slug/toggle-member-promotion', requireAuth(), validateRequest(toggleAdminSchema), toggleCommunityAdmin );

// DELETE /api/v1/communities/:slug/leave
router.delete('/:slug/leave', requireAuth(), leaveCommunity);



// --------------------------------------------------------------------- //

// GET /api/v1/communities/:slug/posts
// GET /api/v1/communities/:slug/posts?limit=10&sort=<newest|popular>
router.get('/:slug/posts', fetchCommunityPosts); 




export default router;

// community - 68309fe72ff21ed0bf824afe, tech-enthusiasts-update3

/*
it will be like :
community owners or admins  can invite any user via user `slug` as `member`.
user can send request to join community via community `slug` and then community owner or admin can accept or reject the request.
community owner or admins can remove any user from community via user `slug` if he is not the owner or admin.
only owner can delete community and remove any admin.
only owner can make any member admin.
only owner can make community private or public. if private, other users who are not part of community can't see the community posts.

user can follow any user via user `slug` as `follower` without any permission.
user can follow any page via page `slug` as `follower` without any permission. 
*/
