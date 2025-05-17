import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

export const moderationActionEnum = z.enum([
  'POST_REMOVED',
  'USER_BANNED',
  'USER_MUTED',
  'COMMENT_DELETED',
  'ROLE_CHANGED',
  'JOIN_REQUEST_DENIED',
  'COMMUNITY_EDITED',
]);

export const createModerationLogSchema = z.object({
  communityId: objectIdSchema,
  action: moderationActionEnum,
  targetUserId: objectIdSchema.optional(),
  targetPostId: objectIdSchema.optional(),
  targetCommentId: objectIdSchema.optional(),
  performedBy: objectIdSchema,
  reason: z.string().max(1000).optional(),
});
