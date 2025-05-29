import { BookmarkModel } from '@/models/bookmark.model';
import { Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { LikeModel } from '@/models/like.model';

export const toggleBookmark = async (userId: string, postId: string) => {
  try {
    const existing = await BookmarkModel.findOne({ userId, postId });

    if (existing && !existing.isDeleted) {
      // Soft delete (unbookmark)
      existing.isDeleted = true;
      existing.deletedAt = new Date();
      await existing.save();
      return { bookmarked: false };
    }

    // Reactivate or insert (bookmark)
    await BookmarkModel.findOneAndUpdate(
      { userId, postId },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          userId,
          postId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return { bookmarked: true };
  } catch (error) {
    throw new Error('Failed to toggle bookmark');
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
    const query: any = { userId, isDeleted: false };

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

    const bookmarks = await BookmarkModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: 'postId',
        populate: {
          path: 'userId',
          model: 'User',
          localField: 'userId',
          foreignField: 'userId',
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

    if (checkLike && postIds.length) {
      const likedPosts = await LikeModel.find({
        userId,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      likedSet = new Set(likedPosts.map((l) => l.postId.toString()));
    }

    if (checkBookmark && postIds.length) {
      const bookmarkedPosts = await BookmarkModel.find({
        userId,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      bookmarkedSet = new Set(bookmarkedPosts.map((b) => b.postId.toString()));
    }

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

    const last = bookmarks[bookmarks.length - 1];
    const nextCursor =
      bookmarks.length === limit && last?.createdAt && last?._id
        ? `${last.createdAt.toISOString()}_${last._id}`
        : null;

    return { bookmarks: enriched, nextCursor };
  } catch (error) {
    throw new Error('Failed to fetch user bookmarks');
  }
};


export const isPostBookmarked = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId, isDeleted: false });
  return !!existing;
};