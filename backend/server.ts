import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './utils/database';
import { connectRedis } from './config/redis.config';
import { initializeSocket } from './utils/socket';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = initializeSocket(server);
    app.set('io', io);

    // Start server
    server.listen(PORT, () => {
      logger.info(`
      🚀 Server started successfully!
      ===================================
      Environment: ${process.env.NODE_ENV || 'development'}
      Port: ${PORT}
      MongoDB: Connected
      Redis: Connected
      Socket.IO: Initialized
      ===================================
      `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Received shutdown signal. Starting graceful shutdown...');
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connections
        await mongoose.connection.close();
        await redisClient.quit();
        
        logger.info('Database connections closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Import mongoose and redis for shutdown
import mongoose from 'mongoose';
import { redisClient } from './config/redis.config';

// Start the server
startServer();