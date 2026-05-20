import { Schema, model } from 'mongoose';
import { PLATFORMS, TONE_PRESETS } from '@casper/shared';

const commentDraftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    postUrl: { type: String, required: true },
    postTextHash: { type: String, required: true, index: true },
    draftText: { type: String, required: true },
    tone: { type: String, enum: TONE_PRESETS, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'posted', 'failed'],
      default: 'pending',
      index: true,
    },
    postedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

commentDraftSchema.index({ userId: 1, postTextHash: 1 }, { unique: true });

export const CommentDraftModel = model('CommentDraft', commentDraftSchema);
