export class ApiError extends Error {
    statusCode: number;
    data: null;
    success: false;
    errors: any[];
    stack?: string;
  
    constructor(
      statusCode: number,
      message = 'Something went wrong',
      errors: any[] = [],
      stack: string = '',
    ) {
      super(message);
  
      this.statusCode = statusCode;
      this.data = null;
      this.success = false;
      this.errors = errors;
  
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  

//   import { ApiError } from '@/utils/ApiError';

// throw new ApiError(404, 'User not found');