import { z } from 'zod';

// Schema for regular users
export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().url().optional(),
    banner: z.string().url().optional(),
    isHidden: z.boolean().optional(),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema.shape.body>;

// Schema for admins (includes all fields)
export const adminUpdateUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().url().optional(),
    banner: z.string().url().optional(),
    isHidden: z.boolean().optional(),

    role: z.enum(['user', 'admin']).optional(),
    isVerified: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
    followerCount: z.number().optional(),
    followingCount: z.number().optional(),
    likeCount: z.number().optional(),
    commentCount: z.number().optional(),
  }),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
