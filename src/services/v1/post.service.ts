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
import { buildPostPipeline } from '@/utils/postPipelineBuilder';
import { LikeModel } from '@/models/like.model';
import { BookmarkModel } from '@/models/bookmark.model';
import { decodeCursor, encodeCursor } from '@/utils/cursor';
import { IMedia } from '@/models/media.model';
import { FollowRequestModel } from '@/models/userFollowRequestModel.model';

export const createPost = async ({ userId, data }: { userId: string; data: createPostInput }) => {
  const { content, tags, attachments, pageId, communityId, isHidden } = data;
const getUserId = await UserModel.findOne({ userId }).select('userId').lean();
  if (!getUserId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Validate page ownership
  if (pageId) {
    const page = await Page.findOne({ _id: pageId, isDeleted: false }).select('owner admins');
    if (!page || !(page.owner === userId || page.admins.includes(userId))) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not the owner or admin of this page');
    }
  }

  // Validate community membership/ownership/admin
  if (communityId) {
    const community = await Community.findOne({ _id: communityId, isDeleted: false }).select(
      'owner members admins',
    );

    const isAuthorized =
      community?.owner === userId ||
      community?.members?.some((m) => m === userId) ||
      community?.admins?.some((a) => a === userId);

    if (!community || !isAuthorized) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You are not a member, owner, or admin of this community',
      );
    }
  }

  // Create new post
  const newPost = await PostModel.create({
    content,
    tags: tags || [],
    userId: getUserId,
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

export const updatePost = async ({
  postId,
  userId,
  data,
}: {
  postId: string;
  userId: string;
  data: UpdatePostInput;
}) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await PostModel.findOne({ _id: postId, isDeleted: false });
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
  if (attachments !== undefined)
    post.attachments = attachments.filter((att): att is IMedia => att !== undefined);

  if (isHidden !== undefined) post.isHidden = isHidden;

  await post.save();

  return post;
};

export const deletePost = async ({ postId, userId }: { postId: string; userId: string }) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await PostModel.findOne({ _id: postId, isDeleted: false });
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


export const getPosts = async ({
  userId,
  sort = 'newest',
  limit = 10,
  cursor,
  checkLike = true,
  checkBookmark = true,
}: {
  userId?: string;
  sort?: 'popular' | 'newest';
  limit?: number;
  cursor?: string;
  checkLike?: boolean;
  checkBookmark?: boolean;
}) => {
  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  const cursorSource = decodedCursor?.source || 'followed';

  let followedUserIds: Types.ObjectId[] = [];
  let followedPageIds: Types.ObjectId[] = [];
const user = userId ? await UserModel.findOne({ userId }).select('_id').lean() : null;

  if (userId) {
    const user = await UserModel.findOne({ userId }).select('following pages').lean();
    followedUserIds = user?.following || [];
    followedPageIds = user?.pages || []; 
  }

  const baseMatch = { isDeleted: false };

  const followedMatch = userId
    ? {
        ...baseMatch,
        $or: [
          { userId: { $in: followedUserIds } },
          { pageId: { $in: followedPageIds } },
        ],
      }
    : baseMatch;

  const excludeMatch = userId
    ? {
        ...baseMatch,
        $nor: [
          { userId: { $in: followedUserIds } },
          { pageId: { $in: followedPageIds } },
        ],
      }
    : baseMatch;

  let followedPosts: any[] = [];
  let remainingPosts: any[] = [];

  if (cursorSource === 'followed') {
    followedPosts = await PostModel.aggregate(
      buildPostPipeline({
        match: followedMatch,
        sort,
        limit: limit + 1,
        cursor: decodedCursor,
      })
    );
followedPosts.forEach((post) => {
  post.isFollowed = true;
});
    if (followedPosts.length < limit + 1 && userId) {
      const excludeIds = followedPosts.map((p) => p._id);
      remainingPosts = await PostModel.aggregate(
        buildPostPipeline({
          match: excludeMatch,
          sort,
          limit: limit - followedPosts.length + 1,
          excludeIds,
        })
      );
    }
  } else {
    remainingPosts = await PostModel.aggregate(
      buildPostPipeline({
        match: excludeMatch,
        sort,
        limit: limit + 1,
        cursor: decodedCursor,
      })
    );
  }

  const posts = [...followedPosts, ...remainingPosts];

  // --- Cursor pagination ---
  let nextCursor = null;
  const hasNextPage = posts.length === limit + 1;

  if (hasNextPage) {
    const last = posts[limit];

    nextCursor = encodeCursor({
      _id: last._id,
      createdAt: new Date(last.createdAt),
      source: followedPosts.length === limit + 1 ? 'followed' : 'remaining',
      ...(sort === 'popular' && { score: last.score }),
    });

    posts.pop(); // Remove the extra one
  }

  // --- Check likes and bookmarks ---
  if (userId && (checkLike || checkBookmark) && posts.length > 0) {
    const postIds = posts.map((p) => p._id.toString());

    let likedMap: Record<string, boolean> = {};
    let bookmarkedMap: Record<string, boolean> = {};

    if (checkLike) {
      const likes = await LikeModel.find({
         userId: user?._id,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      likedMap = likes.reduce<Record<string, boolean>>((acc, like) => {
        acc[like.postId.toString()] = true;
        return acc;
      }, {});
    }

    if (checkBookmark) {
      const bookmarks = await BookmarkModel.find({
         userId: user?._id,
        postId: { $in: postIds },
        isDeleted: false,
      }).select('postId');

      bookmarkedMap = bookmarks.reduce<Record<string, boolean>>((acc, bm) => {
        acc[bm.postId.toString()] = true;
        return acc;
      }, {});
    }

   if (userId && posts.length > 0) {
  const followedSet = new Set(followedUserIds.map((id) => id.toString()));

  const requestDocs = await FollowRequestModel.find({
    fromUserId: user?._id,
    toUserId: { $in: posts.map((p) => p.userId._id) },
    status: 'PENDING',
    isDeleted: false,
  }).select('toUserId');

  const requestSet = new Set(requestDocs.map((r) => r.toUserId.toString()));

  for (const post of posts) {
    const postUserIdStr = post.userId._id.toString();
      const postIdStr = post._id.toString();
    post.isFollowed = followedSet.has(postUserIdStr);
    post.requestStatus = requestSet.has(postUserIdStr) ? 'PENDING' : null;
    if (checkLike) {
    post.isLiked = likedMap[postIdStr] || false;
  }

  if (checkBookmark) {
    post.isBookmarked = bookmarkedMap[postIdStr] || false;
  }
  }
}
  }

  return {
    posts,
    nextCursor,
  };
};


export const getUserPosts = async ({
  userId,
  filter = 'created',
  limit,
  cursor,
  slug,
}: {
  userId: string;
  filter: 'created' | 'liked' | 'commented' | 'replied';
  limit: number;
  cursor?: string;
  slug: string;
}) => {
  const baseMatch: any = { isDeleted: false };
  const getUser = await UserModel.findOne({ slug }).select('_id').lean();
  if (!getUser) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
if(!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    baseMatch.$or = [
      { createdAt: { $lt: new Date(decoded.createdAt) } },
      {
        createdAt: new Date(decoded.createdAt),
        _id: { $lt: new Types.ObjectId(decoded._id as string) },
      },
    ];
  }

  let match: any = { ...baseMatch };
  if (filter === 'created') {
    match.userId = getUser._id;
  } else if (filter === 'liked') {
    match.likes = { $in: [getUser._id] };
  } else if (filter === 'commented' || filter === 'replied') {
    const comments = await CommentModel.find({
      userId: getUser.userId,
      isDeleted: false,
      ...(filter === 'replied' ? { parentCommentId: { $ne: null } } : {}),
    }).select('postId').lean();

    const postIds = [...new Set(comments.map((c) => c.postId.toString()))];
    match._id = { $in: postIds.map((id) => new Types.ObjectId(id)) };
  }

  const posts = await PostModel.find(match)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'name avatar slug',
      strictPopulate: false,
    })
    .lean();

  // Cursor
  let nextCursor = null;
  if (posts.length === limit) {
    const last = posts[posts.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: last.createdAt,
        _id: last._id,
      }),
    ).toString('base64');
  }

  // Likes / Bookmarks
  let likedMap: Record<string, boolean> = {};
  let bookmarkedMap: Record<string, boolean> = {};

  if (userId && posts.length > 0) {
    const currentUser = await UserModel.findOne({ userId }).select('_id').lean();
    const postIds = posts.map((p) => p._id.toString());
if (!currentUser) {
  throw new ApiError(httpStatus.NOT_FOUND, 'Current user not found');
}
    const likes = await LikeModel.find({
      userId: currentUser._id,
      postId: { $in: postIds },
      isDeleted: false,
    }).select('postId');

    likedMap = likes.reduce((acc, like) => {
      acc[like.postId.toString()] = true;
      return acc;
    }, {} as Record<string, boolean>);

    const bookmarks = await BookmarkModel.find({
      userId: currentUser._id,
      postId: { $in: postIds },
      isDeleted: false,
    }).select('postId');

    bookmarkedMap = bookmarks.reduce((acc, bm) => {
      acc[bm.postId.toString()] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  const enrichedPosts = posts.map((post) => ({
    ...post,
    isLiked: likedMap[post._id.toString()] || false,
    isBookmarked: bookmarkedMap[post._id.toString()] || false,
  }));

  return {
    posts: enrichedPosts,
    nextCursor,
  };
};


export const getPostById = async (
  postId: string,
  userId?: string | null,
  checkLike?: boolean,
  checkBookmark?: boolean,
) => {
  const post = await PostModel.findById(postId)
    .populate({
      path: 'userId',
      model: 'User',
      localField: 'userId',
      foreignField: '_id', // <-- match on string field, not _id
      justOne: true,
      select: 'name avatar slug',
    })
    .populate('pageId', 'name avatar slug')
    .populate('communityId', 'name avatar slug')
    .lean();

  if (!post || post.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found or deleted already');
  }

  let isLikedByUser: boolean | undefined = undefined;
  let isBookmarkedByUser: boolean | undefined = undefined;

  if (userId) {
    if (checkLike) {
      isLikedByUser = !!(await LikeModel.findOne({ userId, postId, isDeleted: false }));
    }

    if (checkBookmark) {
      isBookmarkedByUser = !!(await BookmarkModel.findOne({ userId, postId, isDeleted: false }));
    }
  }

  return {
    post,
    isBookmarkedByUser,
    isLikedByUser,
  };
};

export const createComment = async (userId: string, postId: string, data: CreateCommentInput) => {
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
  await PostModel.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

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
  data: UpdateCommentInput,
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
  await PostModel.updateOne({ _id: comment.postId }, { $inc: { commentCount: -1 } });

  return comment;
};

export const fetchPostComments = async (postId: string, userId?: string, cursor?: string) => {
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
    const userComments = comments.filter((c) => c.userId === userId);
    const otherComments = comments.filter((c) => c.userId !== userId);
    reordered = [...userComments, ...otherComments];
  }

  const nextCursor =
    comments.length === COMMENTS_PAGE_LIMIT ? comments[comments.length - 1]._id.toString() : null;

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
  userId?: string,
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

  if (userId) {
    const [userReplies, others] = replies.reduce<[any[], any[]]>(
      (acc, reply) => {
        reply.userId === userId ? acc[0].push(reply) : acc[1].push(reply);
        return acc;
      },
      [[], []],
    );
    sortedReplies = [...userReplies, ...others];
  }

  const nextCursor =
    sortedReplies.length === REPLIES_PAGE_LIMIT
      ? sortedReplies[sortedReplies.length - 1]._id
      : null;

  return {
    replies: sortedReplies,
    nextCursor,
  };
};
