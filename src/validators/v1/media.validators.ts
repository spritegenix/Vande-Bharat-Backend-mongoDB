import { z } from 'zod';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

// Schema for media
export const mediaSchema = z
  .object({
    url: z
      .string()
      .url()
      .regex(
        /^https:\/\/[a-zA-Z0-9.-]+\/[\w\-./%]+$/i,
        'Invalid media URL format'
      ),
    type: z.enum(['IMAGE', 'VIDEO'], {
      required_error: 'Media type is required',
      invalid_type_error: 'Invalid media type',
    }),
    fileName: z.string().min(1).nonempty('File name cannot be empty'),
    mimeType: z
      .string()
      .regex(/^(image|video)\/[a-zA-Z0-9.+-]+$/, 'Invalid MIME type'),
    size: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    uploadedAt: z.coerce.date().optional(),
  })
  .superRefine((media, ctx) => {
    if (media.type === 'IMAGE' && media.size > MAX_IMAGE_SIZE) {
      ctx.addIssue({
        path: ['size'],
        code: z.ZodIssueCode.custom,
        message: 'Image size must not exceed 5MB',
      });
    }

    if (media.type === 'VIDEO' && media.size > MAX_VIDEO_SIZE) {
      ctx.addIssue({
        path: ['size'],
        code: z.ZodIssueCode.custom,
        message: 'Video size must not exceed 100MB',
      });
    }

    if (media.type === 'IMAGE') {
      if (media.width === undefined) {
        ctx.addIssue({
          path: ['width'],
          code: z.ZodIssueCode.custom,
          message: 'Width is required for image type',
        });
      }
      if (media.height === undefined) {
        ctx.addIssue({
          path: ['height'],
          code: z.ZodIssueCode.custom,
          message: 'Height is required for image type',
        });
      }
    }

    if (media.type === 'VIDEO' && media.duration === undefined) {
      ctx.addIssue({
        path: ['duration'],
        code: z.ZodIssueCode.custom,
        message: 'Duration is required for video type',
      });
    }
  })
  .optional();

export const mediaArraySchema = z
  .array(mediaSchema)
  .max(10, 'Maximum of 10 attachments allowed').optional();
export const s3UploadValidator = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().regex(/^(image|video)\/[a-zA-Z0-9.+-]+$/, 'Invalid MIME type'),
  folder: z.enum(['posts', 'avatars', 'covers']),
});
