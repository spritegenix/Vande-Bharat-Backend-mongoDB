import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { createPostSchema, updatePostSchema } from "@/validators/v1/post.validators";
import { getAuth } from '@clerk/express';
import httpStatus from 'http-status';
import * as postService from '@/services/v1/post.service';
import mongoose from "mongoose";

const fetchPosts = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const { sort, limit, cursor } = req.query;

    const result = await postService.getPosts({
        userId: userId || undefined,
        sort: (sort as 'popular' | 'newest') || 'popular',
        limit: parseInt(limit as string) || 10,
        cursor: cursor as string,
    });

    res.status(200).json({
        success: true,
        data: result.posts,
        nextCursor: result.nextCursor,
    });
});

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

    const postId = req.params.postId;
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
    const postId = req.params.postId;
    await postService.deletePost({ postId, userId, });
    res.status(httpStatus.OK).json({
        success: true,
        message: 'Post deleted successfully',
    });
});

const fetchPostById = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
    }
    const post = await postService.getPostById(id, userId);

    if (!post) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
    }

    res.status(200).json({
        success: true,
        data: post,
    });
});

const likePost = asyncHandler(async (req, res) => { });

const commentPost = asyncHandler(async (req, res) => { });

const fetchUserPosts = asyncHandler(async (req, res) => { });

const fetchPostComments = asyncHandler(async (req, res) => { });

const fetchPostLikes = asyncHandler(async (req, res) => { });

const fetchPostReplies = asyncHandler(async (req, res) => { });

export { fetchPosts, createPost, updatePost, deletePost, fetchPostById };