import { z } from 'zod';
import { mediaArraySchema } from './media.validators';

export const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  tags: z.array(z.string()).optional(),
  pageId: z.string().optional(),
  communityId: z.string().optional(),
  attachments: mediaArraySchema.optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  pageId: z.string().optional(),
  communityId: z.string().optional(),
  attachments: mediaArraySchema.optional(),
});

export const postIdParamSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
});