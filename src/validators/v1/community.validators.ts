import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase, alphanumeric, and may include dashes',
  }),
  description: z.string().max(1000).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
});

export const updateCommunitySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
});

