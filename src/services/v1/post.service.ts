import { PostModel } from '@/models/post.model';
import { Page } from '@/models/page/page.model';
import { Community } from '@/models/community.model';
import { UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { createPostInput, UpdatePostInput } from '@/validators/v1/post.validators';
import { CreateCommentInput, UpdateCommentInput } from '@/validators/v1/comment.validator';
import { CommentModel } from '@/models/comment.model';
import { COMMENTS_PAGE_LIMIT, REPLIES_PAGE_LIMIT } from '@/constants';

interface GetPostsParams {
  userId?: string;
  sort?: 'popular' | 'newest';
  limit?: number;
  cursor?: string; // Format: base64 encoded JSON { createdAt, _id }
}

export const createPost = async ({ userId, data }: { userId: string; data: createPostInput; }) => {
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

export const updatePost = async ({ postId, userId, data }: { postId: string; userId: string; data: UpdatePostInput; }) => {
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

export const getPosts = async ({ userId, limit = 10, cursor }: {
  userId?: string;
  sort?: 'popular' | 'newest';
  limit?: number;
  cursor?: string; // Format: base64 encoded JSON { createdAt, _id }
}) => {
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
      .populate({
        path: 'userId',
        model: 'User',
        localField: 'userId',
        foreignField: 'userId',
        justOne: true,
        select: 'name avatar slug', // 👈 only fetch these
      })
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

export const createComment = async (
  userId: string,
  postId: string,
  data: CreateCommentInput
) => {
  // console.log(`"userId": ${userId}, \n "postId": ${postId},\n "data": ${JSON.stringify(data)}`);
  const { content, parentCommentId } = data;

  // Validate postId
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  // Check if the post exists
  const post = await PostModel.findById(postId);
  if (!post || post.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found or has been deleted');
  }

  // Optional parent comment (if this is a reply)
  let parentComment = null;
  if (parentCommentId) {
    // Validate parent comment
    if (!Types.ObjectId.isValid(parentCommentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid parent comment ID');
    }

    parentComment = await CommentModel.findById(parentCommentId);
    if (!parentComment || parentComment.isDeleted) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Parent comment not found or deleted');
    }

    if (parentComment.parentCommentId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Nested replies are not allowed');
    }
  }

  // Create the comment
  const comment = await CommentModel.create({
    postId: new Types.ObjectId(postId),
    userId,
    content,
    parentCommentId: parentComment?._id ?? null,
  });

  // If reply, add to parent's replies array
  if (parentComment) {
    parentComment.replies.push(comment._id as Types.ObjectId);
    await parentComment.save();
  }

  // Increment comment count on post
  await PostModel.updateOne(
    { _id: postId },
    { $inc: { commentCount: 1 } }
  );

  const populatedComment = await CommentModel.findById(comment._id)
    .populate({
      path: 'user', // the virtual field name
      select: 'name avatar slug',
    })
    .lean();

  return populatedComment;

};

export const updateComment = async (
  userId: string,
  commentId: string,
  data: UpdateCommentInput
) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await CommentModel.findById(commentId);
  if (!comment || comment.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found or deleted');
  }

  if (comment.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not allowed to update this comment');
  }

  comment.content = data.content;
  await comment.save();

  return comment;
};

export const deleteComment = async (userId: string, commentId: string) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await CommentModel.findById(commentId);
  if (!comment || comment.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found or already deleted');
  }

  // Only owner can delete
  if (comment.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not allowed to delete this comment');
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  // Decrement comment count on related post
  await PostModel.updateOne(
    { _id: comment.postId },
    { $inc: { commentCount: -1 } }
  );

  return comment;
};

export const fetchPostComments = async (
  postId: string,
  userId?: string,
  cursor?: string
) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  const matchConditions: any = {
    postId: new Types.ObjectId(postId),
    parentCommentId: null,
    isDeleted: false,
  };

  if (cursor && Types.ObjectId.isValid(cursor)) {
    matchConditions._id = { $lt: new Types.ObjectId(cursor) };
  }

  const comments = await CommentModel.find(matchConditions)
    .sort({ createdAt: -1 })
    .limit(COMMENTS_PAGE_LIMIT)
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId',
      justOne: true,
      select: 'name avatar slug', // 👈 only fetch these
    })
    .lean();

  // Move user's own comments to top if authenticated
  let reordered = comments;
  if (userId) {
    const userComments = comments.filter(c => c.userId === userId);
    const otherComments = comments.filter(c => c.userId !== userId);
    reordered = [...userComments, ...otherComments];
  }

  const nextCursor = comments.length === COMMENTS_PAGE_LIMIT
    ? comments[comments.length - 1]._id.toString()
    : null;

  return {
    comments: reordered,
    nextCursor,
  };
};

export const fetchCommentById = async (commentId: string) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await CommentModel.findById(commentId)
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId',
      justOne: true,
      select: 'name avatar slug', // 👈 only fetch these
    })
    .lean();

  if (!comment || comment.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found or deleted');
  }

  return comment;
};

export const getRepliesByCommentId = async (
  commentId: string,
  cursor?: string,
  userId?: string
) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid comment ID');
  }

  const parent = await CommentModel.findById(commentId);
  if (!parent || parent.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parent comment not found or deleted');
  }

  const query: any = {
    parentCommentId: commentId,
    isDeleted: false,
  };

  if (cursor && Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new Types.ObjectId(cursor) };
  }

  const replies = await CommentModel.find(query)
    .sort({ createdAt: -1 })
    .limit(REPLIES_PAGE_LIMIT)
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId', // Clerk ID match
      justOne: true,
      select: 'name avatar slug',
    })
    .lean();

  let sortedReplies = replies;

  // if (userId) {
  //   const [userReplies, others] = replies.reduce<[any[], any[]]>(
  //     (acc, reply) => {
  //       reply.userId === userId ? acc[0].push(reply) : acc[1].push(reply);
  //       return acc;
  //     },
  //     [[], []]
  //   );
  //   sortedReplies = [...userReplies, ...others];
  // }

  const nextCursor = sortedReplies.length === REPLIES_PAGE_LIMIT
    ? sortedReplies[sortedReplies.length - 1]._id
    : null

  return {
    replies: sortedReplies,
    nextCursor,
  };
};