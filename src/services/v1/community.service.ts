import { Community } from '@/models/community.model';
import { Types } from 'mongoose';
import { CreateCommunityInput, UpdateCommunityInput } from '@/validators/v1/community.validators';
import { generateSlug } from '@/utils/generateSlug';
import httpStatus from 'http-status';
import { ApiError } from '@/utils/ApiError';
import { UserModel } from '@/models/user.model';
import { PostModel } from '@/models/post.model';
import { buildPostPipeline } from '@/utils/postPipelineBuilder';
import { decodeCursor, encodeCursor } from '@/utils/cursor';

export const createCommunity = async (
    userId: string,
    data: CreateCommunityInput
) => {
    const { name, description, tags, avatar, banner, isPrivate } = data;

    const slug = await generateSlug(name);

    const community = await Community.create({
        name,
        slug,
        description: description || null,
        tags,
        avatar: avatar || null,
        banner: banner || null,
        isPrivate: isPrivate ?? false,
        owner: userId,
    });

    return community;
};

export const updateCommunity = async (
    userId: string,
    communitySlug: string,
    data: UpdateCommunityInput
) => {
    const community = await Community.findOne({slug: communitySlug, isDeleted: false });

    if (!community) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
    }

    if (community.owner !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only the owner can update the community');
    }

    if (data.name && data.name !== community.name) {
        community.name = data.name;
        community.slug = await generateSlug(data.name, Community);
    }

    if (data.description !== undefined) community.description = data.description;
    if (data.tags !== undefined) community.tags = data.tags;
    if (data.avatar !== undefined) community.avatar = data.avatar;
    if (data.banner !== undefined) community.banner = data.banner;
    if (data.isPrivate !== undefined) community.isPrivate = data.isPrivate;

    await community.save();

    return community;
};

export const getCommunityBySlug = async (slug: string, fields: string[]) => {
    const projection: Record<string, 1> = {};
    for (const field of fields) {
        projection[field] = 1;
    }

    // Ensure population fields are always fetched even if not explicitly requested
    projection['owner'] = 1;
    projection['admins'] = 1;

    const community = await Community.findOne({ slug, isDeleted: false }, projection)
        .populate({
            path: 'owner',
            model: 'User',
            localField: 'userId',
            foreignField: 'userId', 
            justOne: true,
            select: 'name avatar slug',
        })
        .populate({
            path: 'admins',
            model: 'User',
            localField: 'userId',
            foreignField: 'userId', 
            justOne: true,
            select: 'name avatar slug',
        })
        .lean();

    return community;
};

export const getCommunityMembers = async ({
  communitySlug,
  limit,
  cursor,
}: {
  communitySlug: string;
  limit: number;
  cursor?: string;
}) => {
  const community = await Community.findOne({ slug: communitySlug, isDeleted: false });

  if (!community) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  const allUserIds: string[] = [
    community.owner,
    ...community.admins.filter((id) => id !== community.owner),
    ...community.members.filter(
      (id) => id !== community.owner && !community.admins.includes(id)
    ),
  ];

  const startIndex = cursor ? allUserIds.indexOf(cursor) + 1 : 0;
  const paginatedIds = allUserIds.slice(startIndex, startIndex + limit);
  const nextCursor = allUserIds[startIndex + limit] || null;

  const users = await UserModel.find({ userId: { $in: paginatedIds } })
    .select('userId name slug avatar')
    .lean();

  // Maintain original order and attach role
  const userMap = new Map(users.map((u) => [u.userId, u]));
  const orderedUsers = paginatedIds
    .map((id) => {
      const user = userMap.get(id);
      if (!user) return null;

      let role: 'owner' | 'admin' | 'member' = 'member';
      if (id === community.owner) {
        role = 'owner';
      } else if (community.admins.includes(id)) {
        role = 'admin';
      }

      return {
        ...user,
        role,
      };
    })
    .filter(Boolean);

  return {
    members: orderedUsers,
    nextCursor,
  };
};


export const deleteCommunityBySlug = async (ownerUserId: string, communitySlug: string) => {
  const community = await Community.findOne({ slug: communitySlug, isDeleted: false });

  if (!community) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  if (community.owner !== ownerUserId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only the owner can delete the community');
  }

  // Soft delete the community
  community.isDeleted = true;
  community.deletedAt = new Date();
  await community.save();

  // Soft delete all posts within the community
  await PostModel.updateMany(
    { communityId: community._id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  return { message: 'Community and its posts deleted successfully' };
};

export const getPostsByCommunitySlug = async ({ communitySlug, userId, limit, cursor, sort }:{ communitySlug: string; userId?: string; limit: number; cursor?: string; sort: 'newest' | 'popular'; }) => {
 // 1. Find the community by slug
  const community = await Community.findOne({ slug: communitySlug, isDeleted: false });
  if (!community) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  // 2. Access control: private community check
  const isMember =
    userId &&
    (community.owner === userId ||
      community.admins.includes(userId) ||
      community.members.includes(userId));
  if (community.isPrivate && !isMember) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this private community');
  }

  // 3. Decode cursor (if provided)
  let excludeIds:Types.ObjectId[] = [];
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded?._id) {
      excludeIds.push(decoded._id);
    }
  }

  // 4. Build and run pipeline
  const match = {
    communityId: community._id,
    isDeleted: false,
  };

  const pipeline = buildPostPipeline({
    match,
    sort,
    limit,
    excludeIds,
  });

  const posts = await PostModel.aggregate(pipeline);

  const nextCursor = posts.length === limit
    ? encodeCursor({ _id: posts[posts.length - 1]._id, createdAt: posts[posts.length - 1].createdAt })
    : null;

  return {
    posts,
    nextCursor,
  };
};

export const toggleAdminRole = async (
  communitySlug: string,
  requesterId: string,
  targetUserSlug: string
) => {
  const community = await Community.findOne({ slug: communitySlug });
  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  if (community.owner !== requesterId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only the owner can update roles');
  }

  const targetUser = await UserModel.findOne({ slug: targetUserSlug });
  if (!targetUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Target user not found');
  }

  const userId = targetUser.userId;

  if (userId === community.owner) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Owner cannot be toggled');
  }

  const isAdmin = community.admins?.includes(userId);
  if (isAdmin) {
    // Demote: remove from admins
    community.admins = community.admins.filter((id) => id !== userId);
  } else {
    // Promote: add to admins if member
    const isMember = community.members.includes(userId);
    if (!isMember) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a member to be promoted');
    }
    community.admins.push(userId);
  }

  await community.save();
};

export const leaveCommunity = async (communitySlug: string, userId: string) => {
  const community = await Community.findOne({ slug: communitySlug });
  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  if (community.owner === userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Owner cannot leave their own community');
  }

  const isMember = community.members.includes(userId);
  const isAdmin = community.admins?.includes(userId);

  if (!isMember && !isAdmin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You are not a member of this community');
  }

  community.members = community.members.filter((id) => id !== userId);
  community.admins = community.admins?.filter((id) => id !== userId);

  await community.save();
};
