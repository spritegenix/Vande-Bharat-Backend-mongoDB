import { BookmarkModel } from '@/models/bookmark.model';
import { Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { LikeModel } from '@/models/like.model';

export const toggleBookmark = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId });

  if (existing && !existing.isDeleted) {
    // Unbookmark (soft delete)
    existing.isDeleted = true;
    existing.deletedAt = new Date();
    await existing.save();

    return { bookmarked: false };
  }

  // Reactivate or insert
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
};


export const getUserBookmarks = async (
  userId: string,
  limit: number,
  cursor?: string,
  checkLike = false,
  checkBookmark = false
) => {
  const query: any = { userId, isDeleted: false };

  if (cursor) {
    const [createdAt, _id] = cursor.split('_');
    query.$or = [
      { createdAt: { $lt: new Date(createdAt) } },
      {
        createdAt: new Date(createdAt),
        _id: { $lt: new Types.ObjectId(_id) },
      },
    ];
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

  const postIds = bookmarks.map((b) => b.postId?._id?.toString()).filter(Boolean);

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
      postId: {
        ...post,
        isLiked: likedSet.has(post._id.toString()),
        isBookmarked: bookmarkedSet.has(post._id.toString()),
      },
    };
  });

  const next =
    bookmarks.length === limit
      ? `${bookmarks[bookmarks.length - 1].createdAt.toISOString()}_${bookmarks[bookmarks.length - 1]._id}`
      : null;

  return { bookmarks: enriched, nextCursor: next };
};


export const isPostBookmarked = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId, isDeleted: false });
  return !!existing;
};