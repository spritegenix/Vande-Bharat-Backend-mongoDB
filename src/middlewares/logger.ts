import { Request, Response, NextFunction } from 'express';

export const routeLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
};
