import { getAuth } from '@clerk/express';
import { UserModel } from '@/models/user.model';
import { asyncHandler } from '@/utils/asyncHandler';
import HttpStatus from 'http-status';
import { ApiError } from '@/utils/ApiError';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // Attach userId for audit plugin
  (req as any).userId = userId;
  (global as any).mongoose.__userContext = userId;

  // Load user from MongoDB
  const user = await UserModel.findOne({ clerkId: userId });
  if (!user) {
    throw new ApiError(HttpStatus.FORBIDDEN, 'User not found in database');
  }

  (req as any).user = user;

  next();
});
