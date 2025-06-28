import { z } from 'zod';
import { mediaArraySchema } from './media.validators';
import { POSTS_PAGE_LIMIT } from '@/constants';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdMessage = 'Must be a valid 24-character MongoDB ObjectId';

export const createPostSchema = z.object({
  content: z
    .string({
      required_error: 'Content is required',
      invalid_type_error: 'Content must be a string',
    })
    .min(1, 'Content must be at least 1 character long')
    .max(1000, 'Content cannot exceed 1000 characters'),
  
  tags: z
    .array(z.string().min(1, 'Each tag must be a non-empty string'))
    .optional(),

  pageId: z
    .string()
    .regex(objectIdRegex, { message: objectIdMessage })
    .optional(),

  communityId: z
    .string()
    .regex(objectIdRegex, { message: objectIdMessage })
    .optional(),

  attachments: mediaArraySchema.optional(),

  isHidden: z
    .boolean({ invalid_type_error: 'isHidden must be a boolean' })
    .optional(),
});

export type createPostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema.extend({
  isDeleted: z
    .boolean({ invalid_type_error: 'isDeleted must be a boolean' })
    .optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const postIdParamSchema = z.object({
  postId: z
    .string({
      required_error: 'Post ID is required',
      invalid_type_error: 'Post ID must be a string',
    })
    .regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Invalid Post ID format. Must be a 24-character hex string.',
    }),
});
export type PostIdParamInput = z.infer<typeof postIdParamSchema>;

export const commentIdParamSchema = z.object({
  commentId: z
    .string({
      required_error: 'Comment ID is required',
      invalid_type_error: 'Comment ID must be a string',
    })
    .regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Invalid Comment ID format. Must be a 24-character hex string.',
    }),
});
export type CommentIdParamInput = z.infer<typeof commentIdParamSchema>;

export const userPostsQuerySchema = z.object({
  filter: z
    .enum(['created', 'liked', 'commented', 'replied',])
    .optional()
    .default('created'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : POSTS_PAGE_LIMIT)),
  cursor: z.string().optional(),
});