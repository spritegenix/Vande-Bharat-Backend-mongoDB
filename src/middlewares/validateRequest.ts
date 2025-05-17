import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next(); // continue to controller
    } catch (error) {
      if (error instanceof ZodError) {
        error.name = 'ValidationError';
      }
      next
      next(error); // Pass Zod error to centralized error handler
    }
  };
