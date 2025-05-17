import { z } from 'zod';

export const clerkUserDataSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({
    email_address: z.string().email(),
  })),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  image_url: z.string().url(),
});

export const clerkUserCreatedSchema = z.object({
  object: z.literal("event"),
  type: z.literal("user.created"),
  data: clerkUserDataSchema,
});