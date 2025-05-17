import { z } from 'zod';
import { mediaArraySchema } from './media.validators';

export const createPageSchema = z.object({
  name: z.string().min(1, 'Page name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
  banner: z.string().url('Banner must be a valid URL').optional(),
  isVerified: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  owner: z.string().min(1, 'Owner ID is required'),
  moderators: z.array(z.string()).optional(),
  followers: z.array(z.string()).optional(),
  posts: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export const updatePageSchema = createPageSchema.partial();

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// ------------------------------------------------------------------ //

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['PRODUCTS', 'IMAGES']),
  pageId: z.string().min(1),
  attachments: mediaArraySchema.optional(),
  order: z.number().int().nonnegative().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---------------------------------------------------------------------- //

export const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  discountedPrice: z.number().positive().optional(),
  buyLink: z.array(z.string().url()).optional(),
  attachments: mediaArraySchema.optional(),
  categoryId: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
