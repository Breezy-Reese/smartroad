import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

export const cache = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {

    // Only cache GET requests
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

      // store original json function
      const originalJson = res.json.bind(res);

      // override json to cache response
      res.json = ((body: any) => {
        if (res.statusCode === 200) {
          redisClient
            .setEx(key, duration, JSON.stringify(body))
            .catch(err => logger.error('Cache set error:', err));
        }

        return originalJson(body);
      }) as typeof res.json;

      logger.debug(`Cache miss for ${key}`);
      next();

    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

export const clearCache = (pattern: string) => {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const keys = await redisClient.keys(`cache:${pattern}*`);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.debug(`Cleared ${keys.length} cache keys matching ${pattern}`);
      }

      next();

    } catch (error) {
      logger.error('Clear cache error:', error);
      next();
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
  await redisClient.del(`user:${userId}`);
  await redisClient.del(`user:${userId}:profile`);
};