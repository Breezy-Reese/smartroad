import { createClient } from 'redis';
import { logger } from '../utils/logger';

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD,
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('✅ Connected to Redis successfully');

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
};