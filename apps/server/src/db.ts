import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

export const connectDb = async (): Promise<void> => {
  if (!config.mongoUri) {
    logger.error(
      'MONGODB_URI is not set — refusing to start. Drop your Atlas URI into apps/server/.env',
    );
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('mongodb connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongodb error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
      // Connection pool — Mongoose defaults to 100 which is fine for a single
      // node, but pin it so behavior is explicit. Atlas free tier has a 500
      // connection ceiling shared across all clients.
      maxPoolSize: config.mongoMaxPool,
      minPoolSize: config.mongoMinPool,
      maxIdleTimeMS: 30_000,
      // Retry transient writes (e.g. replica-set failover) once before erroring.
      retryWrites: true,
    });
  } catch (err) {
    logger.error({ err }, 'failed to connect to mongodb');
    process.exit(1);
  }
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
