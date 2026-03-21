import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.config';
import { appConfig } from '../config/app.config';

const isDev = process.env.NODE_ENV === 'development';
const redisConfigured = !!process.env.REDIS_HOST;

// ─── Redis Store Factory ──────────────────────────────────────────────────────
// Lazy — only instantiated when REDIS_HOST is set in .env
// Falls back to in-memory if Redis not configured (dev / single instance)

const makeRedisStore = (prefix: string) => {
  if (!redisConfigured) return undefined;
  return new RedisStore({
    // @ts-ignore — rate-limit-redis types issue
    client: redisClient,
    prefix: `rl:${prefix}:`,
  });
};

// ─── General API Limiter ──────────────────────────────────────────────────────

export const apiLimiter = rateLimit({
  windowMs: appConfig.rateLimit.window * 60 * 1000,
  max: appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('api'),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
});

// ─── Auth Limiter ─────────────────────────────────────────────────────────────

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('auth'),
  handler: (_req, res, _next, options) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000 / 60),
    });
  },
});

// ─── Emergency Limiter ────────────────────────────────────────────────────────

export const emergencyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('emergency'),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Emergency rate limit exceeded. Please try again shortly.',
    });
  },
});

// ─── Location Update Limiter ──────────────────────────────────────────────────

export const locationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('location'),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Location update rate limit exceeded.',
    });
  },
});

// ─── Custom Redis Limiter Factory ─────────────────────────────────────────────

export const createRedisLimiter = (
  windowMs: number,
  max: number,
  prefix = 'custom'
) =>
  rateLimit({
    store: makeRedisStore(prefix),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later.',
      });
    },
  });