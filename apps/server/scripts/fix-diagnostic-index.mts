/**
 * One-off (idempotent) repair for the `diagnostics.at_1` index.
 *
 * `at` used to be declared BOTH as `index: true` on the field and as a TTL
 * index via `schema.index({ at: 1 }, { expireAfterSeconds })`. Mongoose warned
 * about the duplicate, and whichever call landed first won — in practice the
 * plain one, so the 30-day expiry never actually applied. Removing the
 * field-level flag then makes Mongoose ask for `at_1` WITH the TTL, which
 * MongoDB refuses as an IndexOptionsConflict (code 85) because a same-named
 * index already exists without it.
 *
 * Dropping the plain index lets the app recreate it correctly on next boot.
 * Safe to run repeatedly and safe to run against a live DB: it only touches an
 * index, and the documents it will then start expiring are ones the schema
 * already declared disposable after 30 days.
 *
 *   pnpm --filter @casper/server exec tsx scripts/fix-diagnostic-index.mts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const TTL_SECONDS = 30 * 24 * 60 * 60;

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Missing env var: MONGODB_URI');

await mongoose.connect(uri);
const db = mongoose.connection.db!;
const col = db.collection('diagnostics');

const indexes = await col.indexes();
const existing = indexes.find((ix) => ix.name === 'at_1');

if (!existing) {
  console.log('at_1 does not exist — nothing to do (the app will create it).');
} else if (existing.expireAfterSeconds === TTL_SECONDS) {
  console.log('at_1 already has the correct TTL — nothing to do.');
} else {
  const cutoff = new Date(Date.now() - TTL_SECONDS * 1000);
  const doomed = await col.countDocuments({ at: { $lt: cutoff } });
  console.log(
    `Dropping plain at_1. ${doomed} diagnostic(s) older than 30 days will be expired once the TTL index is live.`,
  );
  await col.dropIndex('at_1');
  await col.createIndex({ at: 1 }, { expireAfterSeconds: TTL_SECONDS });
  console.log('at_1 recreated with expireAfterSeconds=' + TTL_SECONDS);
}

for (const ix of await col.indexes()) {
  console.log(' ', ix.name, JSON.stringify(ix.key), ix.expireAfterSeconds ?? '');
}
await mongoose.disconnect();
