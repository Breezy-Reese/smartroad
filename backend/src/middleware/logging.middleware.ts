import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/* ============================================================
   REQUEST LOGGER (HTTP LOGS)
============================================================ */

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 500) {
      logger.error(logData);
    } else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
  });

  next();
};

/* ============================================================
   REQUEST DETAILS LOGGER (DEBUG MODE)
============================================================ */

export const requestDetails = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  logger.debug({
    message: 'Request details',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?._id,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  next();
};