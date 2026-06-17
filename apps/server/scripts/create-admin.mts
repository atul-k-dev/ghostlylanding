/* eslint-disable no-console */
/**
 * Dev/ops utility: create (or update) an account and grant admin-panel access.
 *
 * If the email already exists, its password is reset to the one provided and
 * admin access is granted. Otherwise a fresh account is created.
 *
 * Requires apps/server/.env populated with MONGODB_URI.
 *
 * Usage:
 *   pnpm --filter @casper/server create-admin <email> <password> ["Display Name"]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { UserModel } from '../src/models/user.model.js';
import { hashPassword } from '../src/auth/password.js';

const email = process.argv[2]?.toLowerCase();
const password = process.argv[3];
const name = process.argv[4] ?? 'Admin';

if (!email || !password) {
  console.error(
    'Usage: pnpm --filter @casper/server create-admin <email> <password> ["Display Name"]',
  );
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set in apps/server/.env');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  const passwordHash = await hashPassword(password);
  let user = await UserModel.findOne({ email });

  if (user) {
    user.passwordHash = passwordHash;
    user.isAdmin = true;
    await user.save();
    console.log(`✓ Updated existing account ${email} — password reset and admin granted`);
  } else {
    user = await UserModel.create({ name, email, passwordHash, isAdmin: true });
    console.log(`✓ Created admin account ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
