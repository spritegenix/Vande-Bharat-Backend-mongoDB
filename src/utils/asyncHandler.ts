import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next); // ✅ forward error to global handler
  };

// export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
//   Promise.resolve(fn(req, res, next)).catch(next); // allows global error middleware to log error
// };
