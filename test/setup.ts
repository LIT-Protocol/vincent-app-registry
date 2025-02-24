import mongoose from 'mongoose';
import consola from 'consola';

const logger = consola.withTag('test-setup');

export const setupTestDb = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      logger.log('Connecting to MongoDB...');
      await mongoose.connect('mongodb://localhost:27017/vincent-app-registry');
      logger.log('Connected to MongoDB');
    }
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const teardownTestDb = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.log('Closed MongoDB connection');
    }
  } catch (error) {
    logger.error('Failed to close MongoDB connection:', error);
    throw error;
  }
}; 