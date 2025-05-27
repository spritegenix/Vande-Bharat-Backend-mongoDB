import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import httpStatus from 'http-status';
import { ApiError } from '@/utils/ApiError';
//  const errorHandler = (
//   err: unknown,
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ) => {
//   let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
//   let message = 'Internal Server Error';
//   let success = false;
//   let errors: any[] = [];
//   let stack: string | undefined;

//   // Zod validation error
//   if (err instanceof ZodError) {
//     statusCode = httpStatus.BAD_REQUEST;
//     message = 'Validation Error';
//     errors = err.errors.map((e) => ({
//       path: e.path.join('.'),
//       message: e.message,
//     }));
//   }

//   // Custom API error
//   else if (err instanceof ApiError) {
//     statusCode = err.statusCode;
//     message = err.message;
//     errors = err.errors;
//     success = err.success;
//     stack = err.stack;
//   }

//   // Generic JS/TS error
//   else if (err instanceof Error) {
//     message = err.message;
//     stack = err.stack;
//   }

//   res.status(statusCode).json({
//     success,
//     message,
//     data: null,
//     errors,
//     ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {}),
//   });
// };

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Server Error:', err.stack || err.message);

  res.status(err.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
    errors: err.errors || [],
  });
};

export default errorHandler;

/*
OUTPUT :-
{
  "success": false,
  "message": "Validation Error",
  "data": null,
  "errors": [
    {
      "path": "fileType",
      "message": "Invalid MIME type"
    }
  ]
}
*/