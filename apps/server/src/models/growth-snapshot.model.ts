import { Schema, model } from 'mongoose';

/**
 * One row per user per local day — the follower/following counters read off the
 * user's own profile during the daily growth scan. Upserted, so a second scan
 * on the same day refreshes the numbers rather than adding a duplicate point.
 */
const growthSnapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** YYYY-MM-DD in the user's timezone. */
    date: { type: String, required: true },
    followers: { type: Number, required: true, min: 0 },
    following: { type: Number, required: true, min: 0 },
    posts: { type: Number, default: null },
    /** Recent followers that Ghostly followed first (null = not sampled). */
    followedBack: { type: Number, default: null },
    followedBackSample: { type: Number, default: null },
  },
  { timestamps: true },
);

// One point per user per day, and the query the summary endpoint runs.
growthSnapshotSchema.index({ userId: 1, date: -1 }, { unique: true });

export const GrowthSnapshotModel = model('GrowthSnapshot', growthSnapshotSchema);
