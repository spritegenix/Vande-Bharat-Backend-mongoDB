import { Response, NextFunction } from 'express';
import { IUser } from '@/models/user.model';

export const requireRole = (role: 'admin' | 'user') => {
  return (req: any, res: Response, next: NextFunction) => {
    const user: IUser = req.user;
    if (!user || user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role' });
    }
    next();
  };
};
