import { z } from 'zod';
import { countries, UserRole } from '@/constants';

const countryEnum = z.enum(countries, {
  required_error: 'Country is required',
  invalid_type_error: 'Country must be a valid enum value',
});

const stateEnum = z
  .string({ required_error: 'State is required' })
  .min(1, 'State must not be empty')
  .max(100, 'State name too long');

const cityEnum = z
  .string({ required_error: 'City is required' })
  .min(1, 'City must not be empty')
  .max(100, 'City name too long');

const countryCodeRegex = /^\+\d{1,4}$/; // e.g., +91
const mobileNumberRegex = /^[6-9]\d{9}$/; // Basic Indian pattern
const pincodeRegex = /^\d{4,10}$/;

const socialLinksSchema = z
  .array(z.string().url({ message: 'Each social link must be a valid URL' }))
  .max(10, 'Maximum of 10 social links allowed');

const interestSchema = z
  .array(z.string().min(1, 'Interest must not be empty').max(50, 'Interest too long'))
  .max(20, 'Maximum of 20 interests allowed');

export const userBaseSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name must not be empty')
    .max(100, 'Name too long'),

  email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),

  slug: z.string().min(1, 'Slug must not be empty').optional(),

  avatar: z.string().url('Avatar must be a valid URL').optional(),
  banner: z.string().url('Banner must be a valid URL').optional(),

  bio: z.string().max(500, 'Bio too long').optional(),
  interest: interestSchema.optional(),
  socialLinks: socialLinksSchema.optional(),

  mobileNumber: z.string().regex(mobileNumberRegex, {
    message: 'Invalid mobile number (should be a 10-digit Indian number)',
  }).optional(),

  countryCode: z.string().regex(countryCodeRegex, {
    message: 'Invalid country code (expected format: +91)',
  }).optional(),

  address: z.string().max(200, 'Address too long').optional(),
  city: cityEnum.optional(),
  state: stateEnum.optional(),
  country: countryEnum.optional(),

  pincode: z.string().regex(pincodeRegex, {
    message: 'Invalid pincode',
  }).optional(),

  isHidden: z.boolean({ invalid_type_error: 'isHidden must be a boolean' }).optional(),
});

export const updateUserSchema = userBaseSchema.partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserByAdminSchema = userBaseSchema.extend({
  role: z.nativeEnum(UserRole, {
    invalid_type_error: 'Invalid user role',
  }).optional(),

  isVerified: z.boolean({ invalid_type_error: 'isVerified must be a boolean' }).optional(),
  isBlocked: z.boolean({ invalid_type_error: 'isBlocked must be a boolean' }).optional(),
});

export type UpdateUserByAdminInput = z.infer<typeof updateUserByAdminSchema>;
