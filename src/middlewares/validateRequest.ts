import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validates the specified part of the request using a Zod schema.
 * @param schema - The Zod schema to use for validation
 * @param source - Which part of the request to validate ('body', 'params', or 'query')
 */
export const validateRequest = (
  schema: AnyZodObject,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    console.log(`validateRequest middleware for ${source}`);
    try {
      schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next({
          name: 'ValidationError',
          message: 'Validation failed at validateRequest middleware',
          statusCode: 400,
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};


export const findRoute = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    console.log("This route is working");
    next();
  };
};
