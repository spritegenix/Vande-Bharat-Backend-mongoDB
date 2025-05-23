import { RequestHandler } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as likeService from '@/services/v1/like.service';
import { getAuth } from '@clerk/express';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import mongoose from "mongoose";
import { POSTS_PAGE_LIMIT } from '@/constants';

export const toggleLike: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { postId } = req.body;
    if (!postId) {
        return res.status(400).json({ success: false, message: 'postId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
    }
    const result = await likeService.toggleLike(userId, postId);
    res.status(200).json({
        success: true,
        isLiked: result.liked
    });
});

export const checkLike: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
    }
    const liked = await likeService.isPostLiked(userId, postId as string);
    res.status(200).json({
        success: true,
        liked
    });
});

export const getPostLikes: RequestHandler = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { limit, cursor } = req.query;
    const result = await likeService.getPostLikes(postId, parseInt(limit as string) || POSTS_PAGE_LIMIT, cursor as string);
    res.status(200).json({
        success: true,
        likes: result.likes,
        nextCursor: result.nextCursor
    });
});

export const getUserLikedPosts: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { limit, cursor } = req.query;
    const result = await likeService.getUserLikedPosts(userId, parseInt(limit as string) || POSTS_PAGE_LIMIT, cursor as string);
    res.status(200).json({
        success: true,
        likes: result.likedPosts,
        nextCursor: result.nextCursor

    });
});
