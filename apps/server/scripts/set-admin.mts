/* eslint-disable no-console */
/**
 * Dev/ops utility: grant (or revoke) admin-panel access for an account.
 *
 * Requires apps/server/.env populated with MONGODB_URI.
 *
 * Usage:
 *   pnpm --filter @casper/server set-admin <email>            # grant admin
 *   pnpm --filter @casper/server set-admin <email> --revoke   # remove admin
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { UserModel } from '../src/models/user.model.js';

const email = process.argv[2]?.toLowerCase();
const revoke = process.argv.includes('--revoke');

if (!email) {
  console.error('Usage: pnpm --filter @casper/server set-admin <email> [--revoke]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set in apps/server/.env');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  const user = await UserModel.findOne({ email });
  if (!user) {
    console.error(`No user found for ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.isAdmin = !revoke;
  await user.save();
  console.log(`✓ ${email} is now ${revoke ? 'NOT an admin' : 'an ADMIN'}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
