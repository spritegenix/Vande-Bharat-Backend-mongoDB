import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const objectId = z
  .string()
  .regex(objectIdRegex, 'Invalid ObjectId');

// For POST /posts/:postId/comments
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Content is too long'),

  // Optional field if this is a reply to a comment
  parentCommentId: objectId.optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// For PATCH /comments/:commentId
export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Content is too long'),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
