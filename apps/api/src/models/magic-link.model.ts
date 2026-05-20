import { Schema, model } from 'mongoose';

const magicLinkSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    /** Optional extension-supplied nonce that the verify page must echo back. */
    nonce: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL — expired magic links auto-evict
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MagicLinkModel = model('MagicLink', magicLinkSchema);
