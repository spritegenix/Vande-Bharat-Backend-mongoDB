import { BookmarkModel } from '@/models/bookmark.model';
import { Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';

export const toggleBookmark = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId, isDeleted: false });

  if (existing) {
    existing.isDeleted = true;
    existing.deletedAt = new Date();
    await existing.save();

    return { bookmarked: false };
  } else {
    await BookmarkModel.create({ userId, postId });

    return { bookmarked: true };
  }
};

export const getUserBookmarks = async (userId: string, limit: number, cursor?: string) => {
  const query: any = { userId, isDeleted: false };

  if (cursor) {
    const [createdAt, _id] = cursor.split('_');
    query.$or = [
      { createdAt: { $lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), _id: { $lt: new Types.ObjectId(_id) } },
    ];
  }

  const bookmarks = await BookmarkModel.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate('postId')
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId',
      justOne: true,
      select: 'name avatar slug',
    })
    .lean();

  const next = bookmarks.length === limit
    ? `${bookmarks[bookmarks.length - 1].createdAt.toISOString()}_${bookmarks[bookmarks.length - 1]._id}`
    : null;

  return { bookmarks, nextCursor: next };
};

export const isPostBookmarked = async (userId: string, postId: string) => {
  const existing = await BookmarkModel.findOne({ userId, postId, isDeleted: false });
  return !!existing;
};