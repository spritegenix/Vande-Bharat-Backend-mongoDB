import { z } from 'zod';
import { mediaArraySchema } from './media.validators';

export const createPageSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  isHidden: z.boolean().optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = createPageSchema.partial();

export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// ---------------------------CATEGORY--------------------------------------- //

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  type: z.enum(['PRODUCTS', 'MEDIA']),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.extend({
  isPublished: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  categories: z.array(
    z.object({
      categoryId: z.string().min(1),
      order: z.number().int().min(0),
    })
  )
});

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;


// ----------------------------PRODUCT------------------------------------------ //

export const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  currency: z.string().default('INR'),
  price: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  isInOffer: z.boolean().optional(),
  buyLinks: z.array(z.string().url()).optional(),
  attachments: mediaArraySchema,
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  isPublished: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
