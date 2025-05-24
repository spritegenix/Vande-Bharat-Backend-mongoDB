import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export const updateCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
});

export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;

export const toggleAdminSchema = z.object({
  body: z.object({
    userSlug: z.string().min(1, 'User slug is required'),
  }),
});

export type ToggleAdminInput = z.infer<typeof toggleAdminSchema>;