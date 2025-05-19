import { Request, Response, Router } from 'express';
import * as postController from '@/controllers/v1/post.controller';
import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { createPostSchema, postIdParamSchema, updatePostSchema } from '@/validators/v1/post.validators';
import { env } from '@/config/zodSafeEnv';

const router = Router();

// GET /api/v1/posts
router.get('/all-posts', postController.fetchPosts);         

// GET /api/v1/posts/:id
router.get('/:id', postController.fetchPostById);      

// POST /api/v1/posts
router.post('/create-post', requireAuth(), validateRequest(createPostSchema, 'body'), postController.createPost);

// PATCH /api/v1/posts/:id
router.patch('/:id', requireAuth(), validateRequest(postIdParamSchema, 'params'), validateRequest(updatePostSchema, 'body'), postController.updatePost);

// DELETE /api/v1/posts/:id
router.delete('/:id', requireAuth(), validateRequest(postIdParamSchema, 'params'), postController.deletePost);

// ------------------------------------------- //
// GET /api/v1/posts/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});
export default router;
