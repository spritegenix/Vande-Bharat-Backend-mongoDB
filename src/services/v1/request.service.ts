import { Community } from '@/models/community.model';
import { RequestModel } from '@/models/request.model';
import { UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';

// User sending join request to community
export const sendJoinCommunityRequest = async (userId: string, communitySlug: string) => {
  const community = await Community.findOne({ slug: communitySlug, isDeleted: false });
  if (!community) throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  if (community.members.includes(userId) || community.admins.includes(userId) || community.owner === userId) throw new ApiError(httpStatus.BAD_REQUEST, 'Already a member');

  const existing = await RequestModel.findOne({
    fromUserId: userId,
    communityId: community._id,
    type: 'JOIN_COMMUNITY',
    status: 'PENDING',
  });
  if (existing) throw new ApiError(httpStatus.CONFLICT, 'Join request already pending');

  return await RequestModel.create({
    fromUserId: userId,
    communityId: community._id,
    type: 'JOIN_COMMUNITY',
  });
};

// community owner or admin can invite any user
export const sendCommunityInvite = async (
  inviterUserId: string,
  communitySlug: string,
  targetUserSlug: string
) => {
  const community = await Community.findOne({ slug: communitySlug, isDeleted: false });
  if (!community) throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');

  if (community.owner !== inviterUserId && !community.admins.includes(inviterUserId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to invite');
  }

  const targetUser = await UserModel.findOne({ slug: targetUserSlug });
  if (!targetUser) throw new ApiError(httpStatus.NOT_FOUND, 'Target user not found');

  if (
    community.members.includes(targetUser.userId) ||
    community.admins.includes(targetUser.userId) ||
    community.owner === targetUser.userId
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already in community');
  }

  const existing = await RequestModel.findOne({
    toUserId: targetUser.userId,
    communityId: community._id,
    type: 'COMMUNITY_INVITE',
    status: 'PENDING',
  });
  if (existing) throw new ApiError(httpStatus.CONFLICT, 'Invite already pending');

  return await RequestModel.create({
    fromUserId: inviterUserId,
    toUserId: targetUser.userId,
    communityId: community._id,
    type: 'COMMUNITY_INVITE',
  });
};

export const getJoinRequestsForCommunity = async (slug: string, requesterId: string) => {
  const community = await Community.findOne({ slug });
  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  const isAuthorized =
    community.owner === requesterId ||
    community.admins?.includes(requesterId);

  if (!isAuthorized) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view join requests');
  }

  const requests = await RequestModel.find({
    communityId: community._id,
    type: 'JOIN_COMMUNITY',
    status: 'PENDING',
  }).populate({
      path: 'fromUserId',
      model: 'User',
      localField: 'userId',
      foreignField: 'userId', // <-- match on string field, not _id
      justOne: true,
      select: 'name avatar slug',
    })
    ;

  return requests;
};

export const handleJoinRequestResponse = async ({
  communitySlug,
  moderatorId,
  requestId,
  action,
}: {
  communitySlug: string;
  moderatorId: string;
  requestId: string;
  action: 'ACCEPTED' | 'REJECTED';
}) => {
  const community = await Community.findOne({ slug: communitySlug });

  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  const isAuthorized =
    community.owner === moderatorId ||
    community.admins?.includes(moderatorId);

  if (!isAuthorized) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to respond to join requests');
  }

  const joinRequest = await RequestModel.findById(requestId);

  if (!joinRequest || joinRequest.status !== 'PENDING' || joinRequest.type !== 'JOIN_COMMUNITY') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Valid pending join request not found');
  }

  joinRequest.status = action;
  await joinRequest.save();

  if (action === 'ACCEPTED') {
    // Add user to community members if not already added
    const fromUser = joinRequest.fromUserId;
    if (
      !community.members.includes(fromUser as string) &&
      community.owner !== fromUser &&
      !community.admins?.includes(fromUser as string)
    ) {
      community.members.push(fromUser as string);
      await community.save();
    }
  }
};

export const removeMemberFromCommunity = async ({
  communitySlug,
  requesterId,
  memberSlug,
}: {
  communitySlug: string;
  requesterId: string;
  memberSlug: string;
}) => {
  const community = await Community.findOne({ slug: communitySlug });
  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  const isOwner = community.owner === requesterId;
  const isAdmin = community.admins?.includes(requesterId);
  if (!isOwner && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to remove members');
  }

  const member = await UserModel.findOne({ slug: memberSlug });
  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member user not found');
  }

  const memberId = member.userId;

  if (community.owner === memberId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Owner cannot be removed');
  }

  if (!isOwner && community.admins?.includes(memberId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only owner can remove an admin');
  }

  // Remove from members and admins arrays
  community.members = community.members.filter(id => id !== memberId);
  community.admins = community.admins?.filter(id => id !== memberId);
  await community.save();
};

export const cancelJoinCommunityRequest = async (userId: string, communitySlug: string) => {
  const community = await Community.findOne({ slug: communitySlug });
  if (!community || community.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community not found');
  }

  const request = await RequestModel.findOne({
    fromUserId: userId,
    communityId: community._id,
    type: 'JOIN_COMMUNITY',
    status: 'PENDING',
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Pending join request not found');
  }

  await request.deleteOne(); // soft delete handled via auditPlugin
};