import { RequestHandler } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as bookmarkService from '@/services/v1/bookmark.service';
import { getAuth } from '@clerk/express';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import mongoose from "mongoose";
import { POSTS_PAGE_LIMIT } from '@/constants';

export const toggleBookmark: RequestHandler = asyncHandler(async (req, res) => {
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
    const result = await bookmarkService.toggleBookmark(userId, postId);
    res.status(200).json({
        success: true,
        isBookmarked: result.bookmarked
    });
});

export const getBookmarks: RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { limit, cursor, isLiked, isBookmarked } = req.query;

  const result = await bookmarkService.getUserBookmarks(
    userId,
    parseInt(limit as string) || POSTS_PAGE_LIMIT,
    cursor as string,
    isLiked === 'true',
    isBookmarked === 'true'
  );

  res.status(200).json({
    success: true,
    bookmarks: result.bookmarks,
    nextCursor: result.nextCursor,
  });
});



export const checkBookmark: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
    }

    const isBookmarked = await bookmarkService.isPostBookmarked(userId, postId as string);
    res.status(200).json({
        success: true,
        isBookmarked
    });
});
