import { BookmarkModel } from '@/models/bookmark.model';
import { isValidObjectId, Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { LikeModel } from '@/models/like.model';
import { UserModel } from '@/models/user.model';

import mongoose from 'mongoose';
import { FollowRequestModel } from '@/models/userFollowRequestModel.model';
type PopulatedPostUser =
  | {
      userId: {
        _id: Types.ObjectId;
        name: string;
        avatar: string;
        slug: string;
      };
    }
  | {
      userId: Types.ObjectId;
    };
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
  checkLike = true,
  checkBookmark = true,
  checkFollowStatus = true
) => {
  try {
    const user = await UserModel.findOne({ userId }).select('_id').lean();
    if (!user) throw new Error(`User not found with userId: ${userId}`);

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

    const bookmarks = await BookmarkModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: 'postId',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id name avatar slug',
        },
      })
      .lean();

    const postIds: string[] = [];
    const authorIds: string[] = [];

    for (const b of bookmarks) {
      const post = b?.postId as any;

      if (post?._id) {
        postIds.push(post._id.toString());
      }

      const postUser = post?.userId;

      if (postUser && typeof postUser === 'object' && '_id' in postUser) {
        authorIds.push(postUser._id.toString());
      } else if (isValidObjectId(postUser)) {
        authorIds.push(postUser.toString());
      }
    }

    const likedSet = new Set<string>();
    const bookmarkedSet = new Set<string>();
    const followedSet = new Set<string>();
    const requestStatusMap: Record<string, string> = {};

    if (checkLike && postIds.length) {
      const likes = await LikeModel.find({
        userId: user._id,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      likes.forEach((l) => likedSet.add(l.postId.toString()));
    }

    if (checkBookmark && postIds.length) {
      const bms = await BookmarkModel.find({
        userId: user._id,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      bms.forEach((b) => bookmarkedSet.add(b.postId.toString()));
    }

    if (checkFollowStatus && authorIds.length) {
      const currentUser = await UserModel.findById(user._id).select('following').lean();
      currentUser?.following?.forEach((fid: any) => followedSet.add(fid.toString()));

      const requests = await FollowRequestModel.find({
        fromUserId: user._id,
        toUserId: { $in: authorIds },
        isDeleted: false,
      }).select('toUserId status');

      requests.forEach((req) => {
        requestStatusMap[req.toUserId.toString()] = req.status;
      });
    }

    const enriched = bookmarks.map((bookmark) => {
      const post = bookmark.postId as any;
      const postIdStr = post?._id?.toString();

      let author = post?.userId;
      let authorIdStr: string | null = null;

      if (author && typeof author === 'object' && '_id' in author) {
        authorIdStr = author._id.toString();
      } else if (isValidObjectId(author)) {
        authorIdStr = author.toString();
        author = null;
      }

      return {
        ...bookmark,
        postId: {
          ...post,
          isLiked: likedSet.has(postIdStr),
          isBookmarked: bookmarkedSet.has(postIdStr),
          userId: author
            ? {
                ...author,
                isFollowed: followedSet.has(authorIdStr!),
                requestStatus: requestStatusMap[authorIdStr!] || null,
              }
            : post.userId, // fallback if not populated
        },
      };
    });

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