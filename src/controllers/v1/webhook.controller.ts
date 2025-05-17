import { asyncHandler } from '@/utils/asyncHandler';
import { UserModel } from '@/models/user.model';
import { UserRole } from '@/constants';
import { generateSlug } from '@/utils/generateSlug';
import { clerkUserCreatedSchema } from '@/validators/v1/webhook.validators';
import HttpStatus from 'http-status';

export const handleClerkUserCreated = asyncHandler(async (req, res) => {
  const parsed = clerkUserCreatedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'Invalid Clerk webhook payload',
      errors: parsed.error.errors,
    });
  }

  const data = parsed.data.data; // <- Extract the user object
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address ?? '';
  const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
  const slug = await generateSlug(name);
  const avatar = data.image_url;

  const existing = await UserModel.findOne({ clerkId });
  if (existing) {
    return res.status(200).json({ message: 'User already exists' });
  }

  const newUser = await UserModel.create({
    clerkId,
    email,
    name,
    avatar,
    slug,
    role: UserRole.USER,
  });

  return res.status(201).json({ success: true, user: newUser });
});
