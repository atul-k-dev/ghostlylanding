import { Schema, model } from 'mongoose';

const magicLinkSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    /** Failed verify attempts — locks after MAX_ATTEMPTS in auth/magic-link.ts. */
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL — expired sign-in codes auto-evict
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MagicLinkModel = model('MagicLink', magicLinkSchema);
