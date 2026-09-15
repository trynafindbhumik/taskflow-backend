import { Request, Response, NextFunction } from 'express';
import { AppError, TooManyRequestsError } from '../errors/AppError';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    const response: any = { message: err.message };
    if (err.errors) response.errors = err.errors;
    if (err instanceof TooManyRequestsError && err.retryAfter) {
      response.retryAfter = err.retryAfter;
    }
    return res.status(err.statusCode).json(response);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
}
