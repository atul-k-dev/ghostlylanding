import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb, watchIndexBuilds } from './db.js';
import { logger } from './logger.js';
import { startDailySummaryScheduler } from './jobs/daily-summary.js';
import { startWeeklySummaryScheduler } from './jobs/weekly-summary.js';

const main = async (): Promise<void> => {
  if (!config.jwtSecret) {
    logger.error('JWT_SECRET is not set — refusing to start. Set one in apps/server/.env');
    process.exit(1);
  }

  await connectDb();
  const app = createApp();
  // Models are registered by the route imports above, so this has to come after
  // createApp() or there'd be nothing to listen to.
  watchIndexBuilds();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Ghostly247 API listening');
  });

  // End-of-day activity recap emails (hourly check, once per user-local day).
  startDailySummaryScheduler();
  // Weekly recap emails (hourly check, Mondays only, once per user-local week).
  startWeeklySummaryScheduler();

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

  // A rejected promise nobody awaited used to terminate the process on Node 15+
  // with no log line of its own — the container just restarted and the reason
  // was gone. Log it, then exit non-zero so the platform still restarts us.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection — exiting');
    void shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception — exiting');
    // Do NOT keep serving after an uncaught exception: process state is
    // unknown from here, and a half-broken node is worse than a restart.
    process.exit(1);
  });
};

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
