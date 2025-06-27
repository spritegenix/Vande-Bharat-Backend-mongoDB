import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { createPostSchema, updatePostSchema } from "@/validators/v1/post.validators";
import { getAuth } from '@clerk/express';
import httpStatus from 'http-status';
import * as postService from '@/services/v1/post.service';
import mongoose from "mongoose";
import { createCommentSchema, updateCommentSchema } from "@/validators/v1/comment.validator";
import { POSTS_PAGE_LIMIT } from "@/constants";

const createPost = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
        throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
    }

    const post = await postService.createPost({
        userId,
        data: parsed.data,
    });

    res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Post created successfully',
        data: post,
    });
});

const updatePost = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { postId } = req.params;
    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
        throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
    }

    const updatedPost = await postService.updatePost({
        postId,
        userId,
        data: parsed.data,
    });

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost,
    });
});

const deletePost = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { postId } = req.params;
    await postService.deletePost({ postId, userId, });
    res.status(httpStatus.OK).json({
        success: true,
        message: 'Post deleted successfully',
    });
});

const fetchPostById = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    // if (!userId) {
    //     throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    // }
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
    }
    const {isLiked, isBookmarked} = req.query

    const post = await postService.getPostById(postId, userId, isLiked === 'true', isBookmarked === 'true');

    if (!post) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
    }

    res.status(200).json({
        success: true,
        data: post.post,
        isLiked: post.isLikedByUser || false,
        isBookmarked: post.isBookmarkedByUser || false
    });
});

const fetchPosts = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const { sort, limit, cursor, isLiked, isBookmarked } = req.query;

    const result = await postService.getPosts({
        userId: userId || undefined,
        sort: (sort as 'popular' | 'newest') || 'popular',
        limit: parseInt(limit as string) || POSTS_PAGE_LIMIT,
        cursor: cursor as string,
        checkBookmark: isBookmarked === 'true',
        checkLike: isLiked === 'true',
    });
    if(!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Posts not found');
    }
    res.status(200).json({
        success: true,
        data: result.posts,
        nextCursor: result.nextCursor,
        sort: sort || 'created',
        limit: limit || POSTS_PAGE_LIMIT,
    });
});

const fetchUserPosts = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { filter, limit, cursor } = req.query as {
        filter?: 'created' | 'liked' | 'commented' | 'replied';
        limit?: string;
        cursor?: string;
    };

    const result = await postService.getUserPosts({
        userId,
        filter: filter || 'created',
        limit: parseInt(limit as string) || POSTS_PAGE_LIMIT,
        cursor,
    });

    res.status(200).json({
        success: true,
        data: result.posts,
        nextCursor: result.nextCursor,
        filterType: filter || 'created',
        limit: limit || POSTS_PAGE_LIMIT,
    });
});
// --------------------------COMMENTS or REPLIES--------------------------------- //

const createCommentOnPost = asyncHandler(async (req, res) => {
    // console.log('req.body', req.body);
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { postId } = req.params;
    // console.log(`"postId": ${postId}, \n "userId": ${userId},\n "req.body": ${req.body}`);

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Validation Error at controller level',
            errors: parsed.error.errors,
        });
    }

    const comment = await postService.createComment(userId, postId, parsed.data);

    return res.status(httpStatus.CREATED).json({
        success: true,
        message: parsed.data.parentCommentId ? 'Reply created successfully' : 'Comment created successfully',
        data: comment,
    });
});

const updateComment = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    const { commentId } = req.params;

    const parsed = updateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Validation Error',
            errors: parsed.error.errors,
        });
    }

    const updated = await postService.updateComment(userId, commentId, parsed.data);

    return res.status(httpStatus.OK).json({
        success: true,
        message: 'Comment or reply updated successfully',
        data: updated,
    });
});

const deleteComment = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
    }

    const { commentId } = req.params;

    const deletedComment = await postService.deleteComment(userId, commentId);

    return res.status(httpStatus.OK).json({
        success: true,
        message: 'Comment deleted successfully',
        data: deletedComment,
    });
});

const fetchPostComments = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const { postId } = req.params;
    const { cursor } = req.query;
    const result = await postService.fetchPostComments(
        postId,
        userId ?? undefined,
        cursor as string
    );

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Comments fetched successfully',
        data: result,
    });
});

const fetchCommentById = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await postService.fetchCommentById(commentId);

    return res.status(httpStatus.OK).json({
        success: true,
        message: 'Comment fetched successfully',
        data: comment,
    });
});

const fetchCommentReplies = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const { commentId } = req.params;
    const { cursor } = req.query;

    const result = await postService.getRepliesByCommentId(commentId, cursor as string | undefined, userId as string | undefined);

    return res.status(httpStatus.OK).json({
        success: true,
        data: result.replies,
        nextCursor: result.nextCursor
    });
});

export {
    fetchPosts, fetchUserPosts, createPost, updatePost, deletePost, fetchPostById,
    createCommentOnPost, updateComment, deleteComment, fetchPostComments, fetchCommentById,
    fetchCommentReplies
};