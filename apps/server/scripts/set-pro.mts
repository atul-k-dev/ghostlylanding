/* eslint-disable no-console */
/**
 * Dev utility: grant (or revoke) Casper Pro for an account, bypassing Stripe.
 * Useful for testing the full product without a real subscription.
 *
 * Requires apps/server/.env populated with MONGODB_URI.
 *
 * Usage:
 *   pnpm --filter @casper/server set-pro <email>            # grant Pro
 *   pnpm --filter @casper/server set-pro <email> --revoke   # back to free
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { UserModel } from '../src/models/user.model.js';

const email = process.argv[2]?.toLowerCase();
const revoke = process.argv.includes('--revoke');

if (!email) {
  console.error('Usage: pnpm --filter @casper/server set-pro <email> [--revoke]');
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

  if (revoke) {
    user.subscriptionStatus = 'free';
    user.subscriptionPlan = 'free';
    user.currentPeriodEnd = null;
    await user.save();
    console.log(`✓ ${email} is now FREE`);
  } else {
    user.subscriptionStatus = 'active';
    user.subscriptionPlan = 'monthly';
    // One year out so the popup's "Renews …" line shows something sensible.
    user.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await user.save();
    console.log(`✓ ${email} is now PRO (active · monthly)`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
