import { Request, Response, Router } from 'express';
import * as postController from '@/controllers/v1/post.controller';
import * as bookmarkController from '@/controllers/v1/bookmark.controller';
import * as likeController from '@/controllers/v1/like.controller';

import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { commentIdParamSchema, createPostSchema, postIdParamSchema, updatePostSchema, userPostsQuerySchema } from '@/validators/v1/post.validators';
import { env } from '@/config/zodSafeEnv';
import { createCommentSchema, updateCommentSchema } from '@/validators/v1/comment.validator';

const router = Router();

// GET /api/v1/posts/all-posts
// GET /api/v1/posts/all-posts?isLiked=true&isBookmarked=true
// GET /api/v1/posts/all-posts?cursor=66523ffaa8c9d1e8b9e8f127 <-- next postId
// GET /api/v1/posts/all-posts?sort=<popular|newest>&limit=<10>&cursor=<next-postId>
router.get('/all-posts', postController.fetchPosts);

// GET /api/v1/posts/my-posts
// GET /api/v1/posts/my-posts?filter=<created|liked|commented|replied>&limit=<n>&cursor=<cursor>
router.get('/my-posts/:slug', requireAuth(), validateRequest(userPostsQuerySchema, 'query'), postController.fetchUserPosts);



// GET /api/v1/posts/:postId
// GET /api/v1/posts/:postId?isLiked=true&isBookmarked=true
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

// ----------------------USER BOOKMARKS------------------------- //
// POST /api/v1/posts/bookmarks/toggle
router.post('/bookmarks/toggle', requireAuth(), bookmarkController.toggleBookmark);

// GET /api/v1/posts/bookmarks/my-bookmarks
router.get('/bookmarks/my-bookmarks', requireAuth(), bookmarkController.getBookmarks);


// GET /api/v1/posts/bookmarks/check/:postId
router.get('/bookmarks/check/:postId', requireAuth(), bookmarkController.checkBookmark);


// ----------------------USER LIKES------------------------- //
// POST /api/v1/posts/likes/toggle
router.post('/likes/toggle', requireAuth(), likeController.toggleLike);

// GET /api/v1/posts/likes/check/:postId
router.get('/likes/check/:postId', requireAuth(), likeController.checkLike);

// GET /api/v1/posts/likes/my-likes
router.get('/likes/my-likes', requireAuth(), likeController.getPostLikes);


// GET /api/v1/posts/likes/check/:postId
router.get('/likes/check/:postId', requireAuth(), likeController.checkLike);




// ------------------------------------------- //
// GET /api/v1/posts/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});
export default router;



// post_id: 682dbf85b4c780ea704e70be
// comment_id: 682dc084979432674ad05b9c
// reply_id: 682c9f531e0af08c4579d7da

