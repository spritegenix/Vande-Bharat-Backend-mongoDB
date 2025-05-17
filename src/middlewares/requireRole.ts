import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { UserModel } from '@/models/user.model';
import { UserRole } from '@/constants';
import httpStatus from 'http-status';
import { asyncHandler } from '@/utils/asyncHandler';

export const requireRole = (role: UserRole) => {
  return asyncHandler( async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        return;
      }
      const user = await UserModel.findOne({ clerkId: userId });
      if (!user || user.isDeleted) {
        res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
        return;
      }
      if (user.role !== role) {
        res.status(httpStatus.FORBIDDEN).json({ message: 'Forbidden: insufficient permissions' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  });
};
