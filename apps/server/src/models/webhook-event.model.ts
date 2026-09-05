import { Schema, model } from 'mongoose';

/**
 * Stripe event ids we've already handled.
 *
 * Stripe retries any event we don't 2xx, and can deliver the same one more than
 * once even when we do. Today's handlers happen to be write-the-same-state
 * idempotent, but that's a property nobody is enforcing — the first handler
 * that grants credit, sends an email, or increments anything would double-fire.
 *
 * Rows expire after 30 days: far longer than Stripe's retry window (~3 days),
 * short enough that the collection stays small.
 */
const webhookEventSchema = new Schema(
  {
    /** Stripe's `evt_...` id. */
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

webhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookEventModel = model('WebhookEvent', webhookEventSchema);
