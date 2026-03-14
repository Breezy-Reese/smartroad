import app from './app';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database.config';
import { redisClient } from './config/redis.config';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

process.on('exit', (code) => {
  console.log('PROCESS EXITING WITH CODE:', code);
  console.trace('Exit stack trace');
});

console.log('SERVER FILE LOADED');

// Load environment variables
dotenv.config();

// ============================================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================================

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    logger.error(`   - ${envVar}`);
  });
  logger.error('Please check your .env file');
  process.exit(1);
}

// Validate MongoDB URI format
const validateMongoURI = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    return url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:';
  } catch {
    return false;
  }
};

if (!validateMongoURI(process.env.MONGODB_URI!)) {
  logger.error('❌ Invalid MONGODB_URI format');
  process.exit(1);
}

// Validate JWT secrets length
if ((process.env.JWT_SECRET?.length || 0) < 32) {
  logger.warn('⚠️ JWT_SECRET is less than 32 characters. Consider using a longer secret for better security.');
}

if ((process.env.JWT_REFRESH_SECRET?.length || 0) < 32) {
  logger.warn('⚠️ JWT_REFRESH_SECRET is less than 32 characters. Consider using a longer secret for better security.');
}

// Log environment (without sensitive data)
logger.info('📋 Environment Configuration:');
logger.info(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
logger.info(`   PORT: ${process.env.PORT || 5000}`);
logger.info(`   CLIENT_URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
logger.info(`   MONGODB_URI: ${process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@')}`);
logger.info(`   REDIS_HOST: ${process.env.REDIS_HOST || 'not configured'}`);

// Configure Mongoose
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
mongoose.set('autoIndex', true);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`🔌 New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    logger.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// ============================================================
// REDIS CONNECTION - NON-BLOCKING
// ============================================================

const connectRedis = async (retries = 3): Promise<void> => {
  if (!process.env.REDIS_HOST) {
    logger.warn('⚠️ Redis not configured, skipping...');
    return;
  }

  for (let i = 0; i < retries; i++) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      await redisClient.ping();
      logger.info('✅ Redis Connected');

      redisClient.on('error', (err) => {
        logger.error('❌ Redis client error:', err);
      });

      redisClient.on('end', () => {
        logger.warn('⚠️ Redis connection ended');
      });

      return; // Success, exit function
    } catch (error) {
      logger.error(`❌ Redis connection attempt ${i + 1}/${retries} failed:`, error);

      if (i === retries - 1) {
        logger.warn('⚠️ Redis connection failed. Continuing without Redis...');
        return; // Don't throw, just continue without Redis
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('❌ Forceful shutdown due to timeout');
    process.exit(1);
  }, 10000);

  try {
    server.close(async () => {
      logger.info('📡 HTTP server closed');

      try {
        await disconnectDatabase();

        if (redisClient.isOpen) {
          await redisClient.quit();
          logger.info('✅ Redis disconnected');
        }

        clearTimeout(shutdownTimeout);
        logger.info('👋 Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    server.unref();
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// ============================================================
// SERVER STARTUP
// ============================================================

const startServer = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting server...');
    
    // Connect to MongoDB (critical - must succeed)
    await connectDatabase();
    logger.info('✅ Database connected');
    
    // Try Redis but don't block server startup if it fails
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed (caught), continuing without Redis');
      // This catch shouldn't be needed now, but kept for safety
    }
    
    // Start the server regardless of Redis status
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Socket.io server initialized`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      logger.info(`✅ Server is ready to accept connections`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================================
// PROCESS EVENT HANDLERS
// ============================================================

process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  logger.error(err.stack);
  gracefulShutdown('UNCAUGHT EXCEPTION');
});

process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Rejection:', err);
  if (err instanceof Error) {
    logger.error(err.stack);
  }
  gracefulShutdown('UNHANDLED REJECTION');
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('warning', (warning) => {
  logger.warn('⚠️ Process Warning:', warning.message);
});

// ============================================================
// START THE SERVER (SINGLE CALL)
// ============================================================
console.log('CALLING START SERVER');
startServer().then(() => {
  console.log('✅ START SERVER RESOLVED - SERVER IS RUNNING');
}).catch((err) => {
  console.error('❌ START SERVER REJECTED:', err);
  process.exit(1);
});