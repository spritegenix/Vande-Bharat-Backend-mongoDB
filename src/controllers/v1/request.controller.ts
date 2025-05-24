import { RequestHandler } from 'express';
import { getAuth } from '@clerk/express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as requestService from '@/services/v1/request.service';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';

export const joinCommunityRequest = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }
  const { slug } = req.params;

  const request = await requestService.sendJoinCommunityRequest(userId, slug);
  res.status(201).json({ success: true, message: 'Join request sent', data: request });
});

export const inviteUserToCommunity = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }

  const { slug } = req.params;
  const { targetUserSlug } = req.body;

  if (!targetUserSlug) {
    return res.status(400).json({ success: false, message: 'targetUserSlug is required' });
  }

  const request = await requestService.sendCommunityInvite(userId, slug, targetUserSlug);
  res.status(201).json({ success: true, message: 'User invited successfully', data: request });
});

export const getJoinRequests = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const joinRequests = await requestService.getJoinRequestsForCommunity(slug, userId);

  res.status(httpStatus.OK).json({
    success: true,
    data: joinRequests,
  });
});

export const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;
  const { requestId, action } = req.body as {
    requestId: string;
    action: 'ACCEPTED' | 'REJECTED';
  };

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  if (!['ACCEPTED', 'REJECTED'].includes(action)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid action');
  }

  await requestService.handleJoinRequestResponse({
    communitySlug: slug,
    moderatorId: userId,
    requestId,
    action,
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: `Request ${action.toLowerCase()} successfully`,
  });
});

export const removeCommunityMember = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;
  const { memberSlug } = req.body;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  if (!memberSlug) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Member slug is required');
  }

  await requestService.removeMemberFromCommunity({
    communitySlug: slug,
    requesterId: userId,
    memberSlug,
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Member removed successfully',
  });
});

export const cancelJoinRequest = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  await requestService.cancelJoinCommunityRequest(userId, slug);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Join request cancelled successfully',
  });
});