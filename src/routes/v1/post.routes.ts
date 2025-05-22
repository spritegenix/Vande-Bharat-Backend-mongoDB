import { Request, Response, Router } from 'express';
import * as postController from '@/controllers/v1/post.controller';
import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { commentIdParamSchema, createPostSchema, postIdParamSchema, updatePostSchema, userPostsQuerySchema } from '@/validators/v1/post.validators';
import { env } from '@/config/zodSafeEnv';
import { createCommentSchema, updateCommentSchema } from '@/validators/v1/comment.validator';

const router = Router();

// GET /api/v1/posts/all-posts
// GET /api/v1/posts/all-posts?cursor=66523ffaa8c9d1e8b9e8f127 <-- next postId
// GET /api/v1/posts/all-posts?sort=<popular|newest>&limit=<10>&cursor=<next-postId>
router.get('/all-posts', postController.fetchPosts);

// GET /api/v1/posts/my-posts?filter=<type>&limit=<n>&cursor=<cursor>
router.get( '/my-posts', requireAuth(), validateRequest(userPostsQuerySchema, 'query'), postController.fetchUserPosts );

// GET /api/v1/posts/:postId
router.get('/:postId', postController.fetchPostById);

// POST /api/v1/posts/create-post
router.post('/create-post', requireAuth(), validateRequest(createPostSchema, 'body'), postController.createPost);

// PATCH /api/v1/posts/:postId
router.patch('/:postId', requireAuth(), validateRequest(postIdParamSchema, 'params'), validateRequest(updatePostSchema, 'body'), postController.updatePost);

// DELETE /api/v1/posts/:postId
router.delete('/:postId', requireAuth(), validateRequest(postIdParamSchema, 'params'), postController.deletePost);

// ----------------------COMMENTS or REPLIES------------------------- //

// POST /api/v1/posts/:postId/comments/create-comment
router.post('/:postId/comments/create-comment', requireAuth(), validateRequest(postIdParamSchema, 'params'), validateRequest(createCommentSchema, 'body'), postController.createCommentOnPost);

// PATCH /api/v1/posts/comments/:commentId
router.patch('/comments/:commentId', requireAuth(), validateRequest(commentIdParamSchema, 'params'), validateRequest(updateCommentSchema, 'body'), postController.updateComment);

// DELETE /api/v1/posts/comments/:commentId
router.delete('/comments/:commentId', requireAuth(), validateRequest(commentIdParamSchema, 'params'), postController.deleteComment);

// GET /api/v1/posts/:postId/comments -  Optional auth — allow both logged-in and guest users
// GET /api/v1/posts/:postId/comments?cursor=66523ffaa8c9d1e8b9e8f127 <-- next commentId
router.get('/:postId/comments', postController.fetchPostComments);

// GET /api/v1/posts/comments/:commentId
router.get('/comments/:commentId', postController.fetchCommentById);

// GET /api/v1/posts/comments/:commentId/replies
// GET /api/v1/posts/comments/:commentId/replies?cursor=66523ffaa8c9d1e8b9e8f127
router.get('/comments/:commentId/replies', postController.fetchCommentReplies);


// ------------------------------------------- //
// GET /api/v1/posts/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});
export default router;



// post_id: 682dbf85b4c780ea704e70be
// comment_id: 682dc084979432674ad05b9c
// reply_id: 682c9f531e0af08c4579d7da
