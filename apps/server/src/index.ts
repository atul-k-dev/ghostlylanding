import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { logger } from './logger.js';
import { startDailySummaryScheduler } from './jobs/daily-summary.js';

const main = async (): Promise<void> => {
  if (!config.jwtSecret) {
    logger.error('JWT_SECRET is not set — refusing to start. Set one in apps/server/.env');
    process.exit(1);
  }

  await connectDb();
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Ghostly247 API listening');
  });

  // End-of-day activity recap emails (hourly check, once per user-local day).
  startDailySummaryScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectDb();
      logger.info('shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('forced exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
