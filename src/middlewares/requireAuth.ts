import { requireAuth as clerkRequireAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    clerkRequireAuth()(req, res, (err) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized access',
          errors: [err.message],
        });
      }
      next();
    });
  };
};

//  requireAuth({ signInUrl: process.env.CLERK_SIGN_IN_URL })