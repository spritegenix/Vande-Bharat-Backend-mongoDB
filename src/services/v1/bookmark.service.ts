import { BookmarkModel } from '@/models/bookmark.model';
import { Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { LikeModel } from '@/models/like.model';
import { UserModel } from '@/models/user.model';

import mongoose from 'mongoose';

export const toggleBookmark = async (userId: string, postId: string) => {
  try {
    const user = await UserModel.findOne({ userId }).select('_id').lean();
    if (!user) throw new Error(`User not found with userId: ${userId}`);

    const existing = await BookmarkModel.findOne({ userId: user._id, postId });

    if (existing && !existing.isDeleted) {
      existing.isDeleted = true;
      existing.deletedAt = new Date();
      await existing.save();
      return { bookmarked: false };
    }

    await BookmarkModel.findOneAndUpdate(
      { userId: user._id, postId },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          userId: user._id,
          postId: new mongoose.Types.ObjectId(postId),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return { bookmarked: true };
  } catch (error: any) {
    console.error(`[Bookmark Error] Failed for userId=${userId}, postId=${postId}:`, error);
    throw new Error(`Toggle bookmark failed: ${error.message}`);
  }
};



export const getUserBookmarks = async (
  userId: string,
  limit: number,
  cursor?: string,
  checkLike = false,
  checkBookmark = false
) => {
  try {
    // Step 1: Fetch the internal MongoDB user ID
    const user = await UserModel.findOne({ userId }).select('_id').lean();
    if (!user) {
      throw new Error(`User not found with userId: ${userId}`);
    }

    // Step 2: Build query
    const query: any = { userId: user._id, isDeleted: false };
    if (cursor) {
      const [createdAtStr, id] = cursor.split('_');
      if (createdAtStr && id) {
        const createdAt = new Date(createdAtStr);
        query.$or = [
          { createdAt: { $lt: createdAt } },
          {
            createdAt,
            _id: { $lt: new Types.ObjectId(id) },
          },
        ];
      }
    }

    // Step 3: Fetch bookmarks with post and user info
    const bookmarks = await BookmarkModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: 'postId',
        populate: {
          path: 'userId',
          model: 'User',
          localField: 'userId',
          foreignField: '_id',
          justOne: true,
          select: 'name avatar slug',
        },
      })
      .lean();

    const postIds = bookmarks
      .map((b) => b?.postId?._id?.toString())
      .filter(Boolean);

    let likedSet = new Set<string>();
    let bookmarkedSet = new Set<string>();

    // Step 4: Check likes
    if (checkLike && postIds.length) {
      try {
        const likedPosts = await LikeModel.find({
          userId: user._id,
          postId: { $in: postIds },
          isDeleted: false,
        }).select('postId');
        likedSet = new Set(likedPosts.map((l) => l.postId.toString()));
      } catch (err) {
        throw new Error(`Failed to fetch liked posts for user ${userId}`);
      }
    }

    // Step 5: Check bookmarks
    if (checkBookmark && postIds.length) {
      try {
        const bookmarkedPosts = await BookmarkModel.find({
          userId: user._id,
          postId: { $in: postIds },
          isDeleted: false,
        }).select('postId');
        bookmarkedSet = new Set(bookmarkedPosts.map((b) => b.postId.toString()));
      } catch (err) {
        throw new Error(`Failed to re-fetch bookmarked posts for user ${userId}`);
      }
    }

    // Step 6: Enrich posts with isLiked and isBookmarked
    const enriched = bookmarks.map((bookmark) => {
      const post = bookmark.postId;
      return {
        ...bookmark,
        postId: post && {
          ...post,
          isLiked: likedSet.has(post._id.toString()),
          isBookmarked: bookmarkedSet.has(post._id.toString()),
        },
      };
    });

    // Step 7: Cursor pagination
    const last = bookmarks[bookmarks.length - 1];
    const nextCursor =
      bookmarks.length === limit && last?.createdAt && last?._id
        ? `${last.createdAt.toISOString()}_${last._id}`
        : null;

    return { bookmarks: enriched, nextCursor };
  } catch (error: any) {
    console.error('🔥 Error in getUserBookmarks:', error);
    throw new Error(error.message || 'Unexpected error while fetching bookmarks');
  }
};



export const isPostBookmarked = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId, isDeleted: false });
  return !!existing;
};