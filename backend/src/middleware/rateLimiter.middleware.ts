import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.config';
import { appConfig } from '../config/app.config';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: appConfig.rateLimit.window * 60 * 1000, // Convert minutes to milliseconds
  max: appConfig.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

// Emergency endpoints limiter (higher limits for emergency)
export const emergencyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Emergency rate limit exceeded.',
  },
});

// Location update limiter
export const locationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 updates per minute (1 per second)
  message: {
    success: false,
    error: 'Location update rate limit exceeded.',
  },
});

// Redis store for distributed rate limiting (if using multiple instances)
export const createRedisLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    store: new RedisStore({
      // @ts-ignore - rate-limit-redis types issue
      client: redisClient,
      prefix: 'rl:',
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
    },
  });
};