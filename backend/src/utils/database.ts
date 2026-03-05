import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accident_detection';
    
    await mongoose.connect(mongoURI);
    
    logger.info('✅ MongoDB Connected Successfully');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};

export const dropDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.dropDatabase();
    logger.warn('MongoDB database dropped');
  } catch (error) {
    logger.error('Error dropping database:', error);
  }
};

export const clearCollection = async (collectionName: string): Promise<void> => {
  try {
    await mongoose.connection.collection(collectionName).deleteMany({});
    logger.info(`Collection ${collectionName} cleared`);
  } catch (error) {
    logger.error(`Error clearing collection ${collectionName}:`, error);
  }
};

export const createIndexes = async (): Promise<void> => {
  try {
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.createIndexes();
    }
    
    logger.info('Database indexes created');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
};

export const getDatabaseStats = async (): Promise<any> => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    throw error;
  }
};

export const backupDatabase = async (backupPath: string): Promise<void> => {
  // This would use mongodump in production
  logger.info(`Database backup initiated to ${backupPath}`);
};

export const restoreDatabase = async (backupPath: string): Promise<void> => {
  // This would use mongorestore in production
  logger.info(`Database restore initiated from ${backupPath}`);
};