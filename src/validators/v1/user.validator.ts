import { countries, UserRole } from '@/constants';
import { z } from 'zod';

// Optional: You can replace these enums with dynamic country/state/city lists.
const countryEnum = z.enum(countries);
const stateEnum = z.string().min(1).max(100);
const cityEnum = z.string().min(1).max(100);

const countryCodeRegex = /^\+\d{1,4}$/; // +1, +91, +44 etc.
const mobileNumberRegex = /^[6-9]\d{9}$/; // Basic Indian mobile number pattern
const pincodeRegex = /^\d{4,10}$/;

const socialLinksSchema = z.array(z.string().url()).max(10);
const interestSchema = z.array(z.string().min(1).max(50)).max(20);

export const userBaseSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  slug: z.string().min(1).optional(),

  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  interest: interestSchema.optional(),

  socialLinks: socialLinksSchema.optional(),

  mobileNumber: z.string().regex(mobileNumberRegex, {
    message: 'Invalid mobile number',
  }).optional(),

  countryCode: z.string().regex(countryCodeRegex, {
    message: 'Invalid country code (expected format: +91)',
  }).optional(),

  address: z.string().max(200).optional(),
  city: cityEnum.optional(),
  state: stateEnum.optional(),
  country: countryEnum.optional(),

  pincode: z.string().regex(pincodeRegex, {
    message: 'Invalid pincode',
  }).optional(),

  isHidden: z.boolean().optional(),
});

export const updateUserSchema = userBaseSchema.partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserByAdminSchema = userBaseSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  isVerified: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
});