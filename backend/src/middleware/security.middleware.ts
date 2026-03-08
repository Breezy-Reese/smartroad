import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/* ============================================================
   SECURITY HEADERS
============================================================ */

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        process.env.CLIENT_URL || 'http://localhost:3000',
      ],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/* ============================================================
   CORS CONFIG
============================================================ */

export const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export const corsMiddleware = cors(corsOptions);

/* ============================================================
   PREVENT PARAMETER POLLUTION
============================================================ */

export const sanitizeParams = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];

      if (Array.isArray(value)) {
        req.query[key] = value[0] as any;
      }
    });
  }

  next();
};

/* ============================================================
   XSS PROTECTION HEADERS
============================================================ */

export const xssProtection = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  next();
};

/* ============================================================
   ENV CHECK
============================================================ */

export const checkEnv = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
  ];

  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );

    res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });

    return;
  }

  next();
};