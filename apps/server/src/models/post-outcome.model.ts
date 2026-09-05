import { Schema, model } from 'mongoose';

/**
 * How one of the user's own posts performed. Keyed by the post's status id, so
 * each re-scrape updates the same row and the numbers mature over time (a reply
 * seen at 2 hours old will have collected more likes by the next day's scan).
 *
 * Unlike CommentDraft — which deliberately stores only a hash of the *source*
 * post — the text here is the user's own published reply, already public on
 * their timeline, and we keep it so the Growth tab can show them which reply won.
 */
const postOutcomeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Status id of the user's own post. */
    tweetId: { type: String, required: true },
    url: { type: String, required: true },
    text: { type: String, default: '' },
    isReply: { type: Boolean, default: false },
    likes: { type: Number, default: 0, min: 0 },
    replies: { type: Number, default: 0, min: 0 },
    reposts: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: null },
    publishedAt: { type: Date, default: null },
    /** When we last read these numbers off the profile. */
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One row per post per user; plus the "best performers" query.
postOutcomeSchema.index({ userId: 1, tweetId: 1 }, { unique: true });
postOutcomeSchema.index({ userId: 1, likes: -1 });

export const PostOutcomeModel = model('PostOutcome', postOutcomeSchema);
