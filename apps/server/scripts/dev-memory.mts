/* eslint-disable no-console */
/**
 * Run the API against a THROWAWAY in-memory MongoDB, for local testing that
 * must not touch the real database. Everything else (.env's Google client ID,
 * OpenAI key, …) is used as normal; only MONGODB_URI is replaced. All data is
 * gone when you stop it (Ctrl+C).
 *
 * Run with: pnpm --filter @casper/server dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri('ghostly_dev_memory');
if (!/^mongodb:\/\/127\.0\.0\.1[:/]/.test(uri)) throw new Error(`refusing non-local database: ${uri}`);
// Set before config loads — dotenv never overrides a variable that's already set.
process.env.MONGODB_URI = uri;
process.env.SITE_URL ??= 'http://localhost:3000';
console.log(`🧪 in-memory MongoDB at ${uri} — data is discarded on exit`);

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

await import('../src/index.js');
