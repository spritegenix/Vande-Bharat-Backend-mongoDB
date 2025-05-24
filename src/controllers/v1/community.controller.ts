import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { asyncHandler } from '@/utils/asyncHandler';
import { getAuth } from '@clerk/express';
import * as communityService from '@/services/v1/community.service';
import { createCommunitySchema, updateCommunitySchema } from '@/validators/v1/community.validators';
import { COMMUNITY_ALLOWED_FIELDS, COMMUNITY_DEFAULT_FIELDS, POSTS_PAGE_LIMIT } from '@/constants';

export const createCommunity = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
    }

    const parsed = createCommunitySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Validation Error',
            errors: parsed.error.errors,
        });
    }

    const community = await communityService.createCommunity(userId, req.body);

    res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Community created successfully',
        data: community,
    });
});

export const updateCommunity = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    const { communitySlug } = req.params;

    const parsed = updateCommunitySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Validation Error',
            errors: parsed.error.errors,
        });
    }

    const updated = await communityService.updateCommunity(userId, communitySlug, req.body);

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Community updated successfully',
        data: updated,
    });
});

export const getCommunityProfile = asyncHandler(async (req, res) => {
    const { communitySlug } = req.params;
    const rawFields = (req.query.fields as string) || '';
    const fields = rawFields
        .split(',')
        .map((f) => f.trim())
        .filter((f) => COMMUNITY_ALLOWED_FIELDS.includes(f));

    const finalFields = [...new Set([...COMMUNITY_DEFAULT_FIELDS, ...fields])];

    const community = await communityService.getCommunityBySlug(communitySlug, finalFields);

    if (!community) {
        return res.status(httpStatus.NOT_FOUND).json({ message: 'Community not found' });
    }

    res.status(200).json({
        success: true,
        data: community,
    });
});

export const fetchCommunityMembers = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { limit = '20', cursor } = req.query;

    const result = await communityService.getCommunityMembers({
        communitySlug: slug,
        limit: parseInt(limit as string),
        cursor: cursor as string | undefined,
    });

    res.status(200).json({
        success: true,
        data: result.members,
        nextCursor: result.nextCursor,
    });
});

export const deleteCommunity = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized user' });
    }

    const { communitySlug } = req.params;

    const result = await communityService.deleteCommunityBySlug(userId, communitySlug);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

export const fetchCommunityPosts = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { cursor, limit = POSTS_PAGE_LIMIT, sort = 'newest' } = req.query;
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }

  const result = await communityService.getPostsByCommunity({
    communitySlug: slug,
    userId,
    cursor: cursor as string,
    limit: parseInt(limit as string),
    sort: sort as 'newest' | 'popular',
  });

  res.status(200).json({
    success: true,
    data: result.posts,
    nextCursor: result.nextCursor,
  });
});

export const toggleCommunityAdmin = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
  }
  const { slug } = req.params;
  const { userSlug } = req.body;

  await communityService.toggleAdminRole(slug, userId, userSlug);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Role updated successfully',
  });
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
  }
  const { slug } = req.params;

  await communityService.leaveCommunity(slug, userId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'You have left the community',
  });
});

