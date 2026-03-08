import app from './app';
import { logger } from './utils/logger';
import mongoose from 'mongoose';
import { redisClient } from './config/redis.config';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================================

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Check for missing required environment variables
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
logger.info(`   CLIENT_URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
logger.info(`   MONGODB_URI: ${process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@')}`);
logger.info(`   REDIS_HOST: ${process.env.REDIS_HOST || 'not configured'}`);

// Configure Mongoose
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
mongoose.set('autoIndex', true);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with better configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartroad';
  
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      
      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected');
      });
      
      return;
    } catch (error) {
      logger.error(`❌ MongoDB connection attempt ${i + 1}/${retries} failed:`, error);
      
      if (i === retries - 1) {
        logger.error('❌ All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }
      
      // Exponential backoff
      const delay = Math.min(5000 * Math.pow(2, i), 30000);
      logger.info(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Redis connection with retry logic
const connectRedis = async (retries = 3) => {
  // Skip Redis if not configured
  if (!process.env.REDIS_HOST) {
    logger.warn('⚠️ Redis not configured, skipping...');
    return;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      
      // Test Redis connection
      await redisClient.ping();
      logger.info('✅ Redis Connected');
      
      // Handle Redis events
      redisClient.on('error', (err) => {
        logger.error('❌ Redis client error:', err);
      });
      
      redisClient.on('end', () => {
        logger.warn('⚠️ Redis connection ended');
      });
      
      return;
    } catch (error) {
      logger.error(`❌ Redis connection attempt ${i + 1}/${retries} failed:`, error);
      
      if (i === retries - 1) {
        logger.warn('⚠️ Redis connection failed. Continuing without Redis...');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);
  
  // Set shutdown timeout
  const shutdownTimeout = setTimeout(() => {
    logger.error('❌ Forceful shutdown due to timeout');
    process.exit(1);
  }, 10000);
  
  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info('📡 HTTP server closed');
      
      try {
        // Close database connections
        await mongoose.disconnect();
        logger.info('✅ MongoDB disconnected');
        
        // Close Redis connection
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
    
    // Force close server connections
    server.unref();
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// ============================================================
// SERVER STARTUP
// ============================================================

const startServer = async () => {
  try {
    logger.info('🚀 Starting server...');
    
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Socket.io server initialized`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      logger.info(`✅ Server is ready to accept connections`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  logger.error(err.stack);
  gracefulShutdown('UNCAUGHT EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Rejection:', err);
  if (err instanceof Error) {
    logger.error(err.stack);
  }
  gracefulShutdown('UNHANDLED REJECTION');
});

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle warning events
process.on('warning', (warning) => {
  logger.warn('⚠️ Process Warning:', warning.message);
});

// Start the server
startServer();

// Keep the process alive - THIS IS THE KEY FIX!
process.stdin.resume();

// Log that the server is running
logger.info('✨ Server process is now running. Press Ctrl+C to stop.');