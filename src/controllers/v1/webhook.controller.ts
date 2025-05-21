import { asyncHandler } from '@/utils/asyncHandler';
import { UserModel } from '@/models/user.model';
import { UserRole } from '@/constants';
import { generateSlug } from '@/utils/generateSlug';
import { clerkUserCreatedSchema } from '@/validators/v1/webhook.validators';
import { Request, Response } from 'express';
import httpStatus from 'http-status';

export const handleClerkUserCreated = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = clerkUserCreatedSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid Clerk webhook payload',
        errors: parsed.error.errors,
      });
    }

    const { data } = parsed.data;

    const userId = data.id;
    const email = data.email_addresses?.[0]?.email_address ?? '';
    const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
    const slug = await generateSlug(name);
    const avatar = data.image_url;

    const existingUser = await UserModel.findOne({ userId });

    if (existingUser) {
      return res.status(httpStatus.OK).json({
        success: true,
        message: 'User already exists',
        user: existingUser,
      });
    }
    // console.log(userId, email, name, slug, avatar);
    try {
      const newUser = await UserModel.create({
        userId,
        email,
        name,
        avatar,
        slug,
        role: UserRole.USER,
      });
      // console.log('✅ Created user:', newUser);

      return res.status(httpStatus.CREATED).json({
        success: true,
        message: 'User created successfully',
        user: newUser,
      });
    } catch (err) {
      // console.error('❌ Error while creating user:', err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error while creating user',
      })
    }
  }
);
