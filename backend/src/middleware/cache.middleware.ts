import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

export const cache = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        logger.debug(`Cache hit for ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);

      res.json = ((body: any) => {
        if (res.statusCode === 200) {
          redisClient
            .setEx(key, duration, JSON.stringify(body))
            .catch((err) => logger.error('Cache set error:', err));
        }

        return originalJson(body);
      }) as typeof res.json;

      logger.debug(`Cache miss for ${key}`);
      return next();

    } catch (error) {
      logger.error('Cache middleware error:', error);
      return next();
    }
  };
};

export const clearCache = (pattern: string) => {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const keys = await redisClient.keys(`cache:${pattern}*`);

      if (keys.length > 0) {
        // ✅ Fix for redis v4 typing
        await redisClient.del(keys as string[]);
        logger.debug(`Cleared ${keys.length} cache keys matching ${pattern}`);
      }

      return next();
    } catch (error) {
      logger.error('Clear cache error:', error);
      return next();
    }
  };
};

export const cacheUserData = async (userId: string, data: any) => {
  return redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(data));
};

export const getCachedUserData = async (userId: string) => {
  const data = await redisClient.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateUserCache = async (userId: string) => {
  await redisClient.del([`user:${userId}`]);
  await redisClient.del([`user:${userId}:profile`]);
};