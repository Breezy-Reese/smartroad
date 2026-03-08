import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/* =========================
   CUSTOM APP ERROR
========================= */

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/* =========================
   ERROR HANDLER
========================= */

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  // Convert non-AppError into AppError
  if (!(error instanceof AppError)) {
    error = new AppError(error.message || 'Internal Server Error', error.statusCode || 500);
  }

  logger.error(`${req.method} ${req.path} - ${error.message}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    user: (req as any).user?._id,
  });

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }

  // Duplicate key
  if ((err as any)?.code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0];
    error = new AppError(
      `Duplicate field value: ${field}. Please use another value`,
      400
    );
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values((err as any).errors || {}).map(
      (e: any) => e.message
    );
    error = new AppError(`Validation error: ${errors.join('. ')}`, 400);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired. Please log in again', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(error.isOperational && { code: error.statusCode }),
  });
};

/* =========================
   404 HANDLER
========================= */

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new AppError(`Not found - ${req.originalUrl}`, 404));
};

/* =========================
   SAFE CATCH ASYNC
========================= */

export const catchAsync = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};