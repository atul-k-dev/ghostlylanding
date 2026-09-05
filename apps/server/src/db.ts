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

/**
 * Watch for index build failures.
 *
 * Mongoose builds schema indexes automatically on startup and reports failures
 * through a per-model 'index' event that, by default, nobody is listening to —
 * so the app boots happily WITHOUT an index it believes exists. That matters
 * most for the unique index on ActionLog {userId, clientId}: without it, the
 * action-log dedupe loses its guarantee under concurrent flushes and a user's
 * monthly quota can be double-counted again, silently.
 */
export const watchIndexBuilds = (): void => {
  for (const name of mongoose.modelNames()) {
    mongoose.model(name).on('index', (err: unknown) => {
      if (err) {
        logger.error({ err, model: name }, 'INDEX BUILD FAILED — queries may be slow or unsafe');
      }
    });
  }
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
