import { Router } from 'express';
import * as userController from '@/controllers/v1/user.controller';
import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { updateUserSchema } from '@/validators/v1/user.validator';
const router = Router(); 


// GET /api/v1/users/me
router.get('/me',requireAuth(), userController.getMyProfile);

// PATCH /api/v1/users/:slug
router.patch( '/:slug', requireAuth(), validateRequest(updateUserSchema), userController.updateUser );


export default router;



// Endpoint : /api/v1/users