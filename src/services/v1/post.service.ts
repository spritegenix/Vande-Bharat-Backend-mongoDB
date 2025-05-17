import mongoose from 'mongoose';
import { PostModel } from '@/models/post.model';
import { Page } from '@/models/page/page.model';
import { Community } from '@/models/community.model';
import { IUser, UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import dayjs from 'dayjs';
import { Types } from 'mongoose';

interface CreatePostInput {
  clerkId: string;
  data: {
    content: string;
    tags?: string[];
    pageId?: string;
    communityId?: string;
    attachments?: any[];
  };
}

interface GetPostsParams {
  clerkId?: string;
  sort?: 'popular' | 'newest';
  limit?: number;
  cursor?: string; // Format: base64 encoded JSON { createdAt, _id }
}

export const createPost = async ({ clerkId, data }: CreatePostInput) => {
  const mongoUser = await UserModel.findOne({ clerkId }) as IUser;
  if (!mongoUser || !mongoUser._id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
  }

  const { content, tags, attachments, pageId, communityId } = data;

  // Check if user is owner of the page
  if (pageId) {
    const page = await Page.findById(pageId).select('owner');
    if (!page || !page.owner.equals(mongoUser._id)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not the owner of this page');
    }
  }

  // Check if user is owner or member of the community
  if (communityId) {
    const community = await Community.findById(communityId).select('owner members admins');
    if (
      !community ||
      (!community.owner.equals(mongoUser._id) &&
        !community.members.some((m) => m.equals(mongoUser._id))) &&
        !community.admins.some((a) => a.equals(mongoUser._id))
    ) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member or owner or admin of this community');
    }
  }

  const post = await PostModel.create({
    content,
    tags,
    attachments,
    userId: mongoUser._id,
    pageId: pageId ? new mongoose.Types.ObjectId(pageId) : undefined,
    communityId: communityId ? new mongoose.Types.ObjectId(communityId) : undefined,
  });

  return post;
};

export const getPosts = async ({ clerkId, sort = 'popular', limit = 10, cursor }: GetPostsParams) => {
  const cutoff = dayjs().subtract(36, 'hour').toDate();
  const now = new Date();

  let followedUserIds: Types.ObjectId[] = [];
  let followedPageIds: Types.ObjectId[] = [];

  if (clerkId) {
    const user = await UserModel.findOne({ clerkId }).select('following pages');
    followedUserIds = user?.following ?? [];
    followedPageIds = user?.pages ?? [];
  }

  const matchBase: any = { isDeleted: false };
  const matchRecent: any = {
    ...matchBase,
    createdAt: { $gte: cutoff },
    ...(clerkId && {
      $or: [
        { userId: { $in: followedUserIds } },
        { pageId: { $in: followedPageIds } },
      ],
    }),
  };

  const sortField = sort === 'popular' ? 'popularityScore' : 'createdAt';

  // Decode cursor
  let cursorFilter: any = {};
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    if (sort === 'popular') {
      cursorFilter = {
        $or: [
          { popularityScore: { $lt: decoded.popularityScore } },
          {
            popularityScore: decoded.popularityScore,
            _id: { $lt: new Types.ObjectId(decoded._id) },
          },
        ],
      };
    } else {
      cursorFilter = {
        $or: [
          { createdAt: { $lt: new Date(decoded.createdAt) } },
          {
            createdAt: new Date(decoded.createdAt),
            _id: { $lt: new Types.ObjectId(decoded._id) },
          },
        ],
      };
    }
  }

  const pipeline: any[] = [
    { $match: matchRecent },
    {
      $addFields: {
        popularityScore: {
          $divide: [
            { $add: ['$likeCount', { $size: '$comments' }] },
            {
              $max: [1, {
                $divide: [
                  { $subtract: [now, '$createdAt'] },
                  1000 * 60 * 60,
                ],
              }],
            },
          ],
        },
      },
    },
    ...(cursor ? [{ $match: cursorFilter }] : []),
    { $sort: { [sortField]: -1, _id: -1 } },
    { $limit: limit + 1 }, // Fetch one extra to detect `hasNextPage`
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'pages',
        localField: 'pageId',
        foreignField: '_id',
        as: 'page',
      },
    },
    {
      $lookup: {
        from: 'communities',
        localField: 'communityId',
        foreignField: '_id',
        as: 'community',
      },
    },
    { $unwind: { path: '$page', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$community', preserveNullAndEmptyArrays: true } },
  ];

  const results = await PostModel.aggregate(pipeline);

  const posts = results.slice(0, limit);
  const hasNextPage = results.length > limit;

  let nextCursor = null;
  if (hasNextPage) {
    const last = posts[posts.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify(
        sort === 'popular'
          ? { popularityScore: last.popularityScore, _id: last._id }
          : { createdAt: last.createdAt, _id: last._id }
      )
    ).toString('base64');
  }

  return {
    posts,
    nextCursor,
  };
};

export const getPostById = async (postId: string, clerkId?: string | null) => {
  // Optional: Fetch user if clerkId provided
  let mongoUserId: Types.ObjectId | undefined;
  if (clerkId) {
    const user = await UserModel.findOne({ clerkId }).select('_id');
    mongoUserId = user?._id;
  }

  const post = await PostModel.findById(postId)
    .populate('userId', 'name avatar')
    .populate('pageId', 'name avatar slug')
    .populate('communityId', 'name avatar slug')
    .lean();

  if (!post || post.isDeleted) return null;

  return {
    ...post,
    isLiked: mongoUserId ? post.likes?.some((id: any) => id.equals(mongoUserId)) : false,
    isBookmarked: mongoUserId ? post.bookmarks?.some((id: any) => id.equals(mongoUserId)) : false,
  };
};