import mongoose from 'mongoose';
import { PostModel } from '@/models/post.model';
import { Page } from '@/models/page/page.model';
import { Community } from '@/models/community.model';
import { IUser, UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { createPostInput, UpdatePostInput } from '@/validators/v1/post.validators';

interface GetPostsParams {
  userId?: string;
  sort?: 'popular' | 'newest';
  limit?: number;
  cursor?: string; // Format: base64 encoded JSON { createdAt, _id }
}

export const createPost = async ({ userId, data, }: { userId: string; data: createPostInput; }) => {
  const { content, tags, attachments, pageId, communityId, isHidden } = data;

  // Validate page ownership
  if (pageId) {
    const page = await Page.findOne({ _id: pageId, isDeleted: false }).select('owner');
    if (!page || !page.owner.equals(userId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not the owner of this page');
    }
  }

  // Validate community membership/ownership/admin
  if (communityId) {
    const community = await Community.findOne({ _id: communityId, isDeleted: false }).select('owner members admins');

    const isAuthorized =
      community?.owner?.equals(userId) ||
      community?.members?.some((m) => m.equals(userId)) ||
      community?.admins?.some((a) => a.equals(userId));

    if (!community || !isAuthorized) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You are not a member, owner, or admin of this community'
      );
    }
  }

  // Create new post
  const newPost = await PostModel.create({
    content,
    tags: tags || [],
    userId: userId,
    pageId: pageId ? new Types.ObjectId(pageId) : undefined,
    communityId: communityId ? new Types.ObjectId(communityId) : undefined,
    attachments: attachments || [],
    isHidden: isHidden || false,
  });
  if (!newPost) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create post');
  }

  return newPost;
};

export const updatePost = async ({ postId, userId, data, }: { postId: string; userId: string; data: UpdatePostInput; }) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await PostModel.findOne({ _id: postId, isDeleted: false, });
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found or deleted');
  }

  if (post.userId.toString() !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not the owner of this post');
  }
  const { content, tags, attachments, isHidden } = data;

  // Update post
  // Update post fields
  if (content !== undefined) post.content = content;
  if (tags !== undefined) post.tags = tags;
  if (attachments !== undefined) post.attachments = attachments;
  if (isHidden !== undefined) post.isHidden = isHidden;

  await post.save();

  return post;

};

export const deletePost = async ({ postId, userId }: { postId: string; userId: string; }) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await PostModel.findOne({ _id: postId, isDeleted: false, });
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found or deleted already');
  }

  if (post.userId.toString() !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not the owner of this post');
  }

  post.isDeleted = true;
  await post.save();

  return post;
};

export const getPosts = async ({ userId, limit = 10, cursor }: GetPostsParams) => {
  let followedUserIds: string[] = [];
  let followedPageIds: Types.ObjectId[] = [];

  if (userId) {
    const user = await UserModel.findOne({ userId }).select('following pages').lean();
    followedUserIds = user?.following?.map(id => id.toString()) || [];
    followedPageIds = user?.pages || [];
  }

  // Handle cursor decoding
  let cursorFilter: any = {};
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
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

  // Build base match
  const baseMatch = {
    isDeleted: false,
    ...cursorFilter,
  };

  // Stage 1: Followed users/pages
  const followedMatch = userId
    ? {
        ...baseMatch,
        $or: [
          { userId: { $in: followedUserIds } },
          { pageId: { $in: followedPageIds } },
        ],
      }
    : null;

  const followedPosts = userId
    ? await PostModel.find(followedMatch)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean()
    : [];

  let remainingPosts: any[] = [];

  // If fewer than `limit`, fill from non-followed
  if (userId && followedPosts.length < limit) {
    const excludeIds = followedPosts.map(p => p._id);
    const excludeMatch = {
      ...baseMatch,
      _id: { $nin: excludeIds },
      $nor: [
        { userId: { $in: followedUserIds } },
        { pageId: { $in: followedPageIds } },
      ],
    };

    remainingPosts = await PostModel.find(excludeMatch)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit - followedPosts.length)
      .lean();
  }

  const publicPosts = !userId
    ? await PostModel.find(baseMatch)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean()
    : [];

  const posts = userId ? [...followedPosts, ...remainingPosts] : publicPosts;
  const hasNextPage = posts.length === limit;

  let nextCursor = null;
  if (hasNextPage) {
    const last = posts[posts.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: last.createdAt,
        _id: last._id,
      })
    ).toString('base64');
  }

  return {
    posts,
    nextCursor,
  };
};

export const getPostById = async (postId: string, userId?: string | null) => {
  const post = await PostModel.findById(postId)
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId', // <-- match on string field, not _id
      justOne: true,
      select: 'name avatar slug',
    })
    .populate('pageId', 'name avatar slug')
    .populate('communityId', 'name avatar slug')
    .lean();

  if (!post || post.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found or deleted already');
  }

  const isLiked = userId ? post.likes?.includes(userId) : false;
  const isBookmarked = userId ? post.bookmarks?.includes(userId) : false;

  return {
    ...post,
    isLiked,
    isBookmarked,
  };
};


// post_id: 682b60fd62a516d8f4671268