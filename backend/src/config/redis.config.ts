import { createClient } from 'redis';
import { logger } from '../utils/logger';

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        logger.warn('⚠️ Redis unavailable after 3 attempts, running without cache');
        return false; // stop retrying, don't crash
      }
      return retries * 500;
    },
  },
  password: process.env.REDIS_PASSWORD,
});

// Suppress unhandled Redis errors so the app keeps running
redisClient.on('error', (err) => {
  logger.warn(`Redis error (non-fatal): ${err.message}`);
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('✅ Connected to Redis successfully');
    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });
  } catch (error) {
    logger.warn('⚠️ Redis unavailable, continuing without cache. App will work normally.');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    // ignore - Redis may already be disconnected
  }
};
