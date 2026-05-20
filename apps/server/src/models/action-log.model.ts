import { Schema, model } from 'mongoose';
import { ACTION_TYPES, PLATFORMS } from '@casper/shared';

const actionLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    actionType: { type: String, enum: ACTION_TYPES, required: true },
    targetUrl: { type: String, required: true },
    targetHandle: { type: String, default: null },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, default: null },
    timestamp: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

actionLogSchema.index({ userId: 1, timestamp: -1 });

export const ActionLogModel = model('ActionLog', actionLogSchema);
