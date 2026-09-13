import { Schema, model } from 'mongoose';

/**
 * Extension-side problems, reported centrally.
 *
 * The extension already recorded these locally — a selector that matched
 * nothing, a tab that never loaded, an auto-pause — but they never left the
 * user's machine, so the first we heard of a fleet-wide breakage was a support
 * email days later. A spike in `selector_miss` for one context is the signal
 * that X changed its DOM.
 */
export const DIAGNOSTIC_KINDS = [
  'selector_miss',
  'tab_load_timeout',
  'network_error',
  'auth_failure',
  'rate_limited',
  'auto_pause',
  'crash',
] as const;

const diagnosticSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: DIAGNOSTIC_KINDS, required: true },
    /** Where it happened, e.g. "twitter:like" or "twitter:home". */
    context: { type: String, required: true },
    detail: { type: String, default: null },
    /** Extension version, so a spike can be tied to a release. */
    extensionVersion: { type: String, default: null },
    /** Which selector map the client was running when it broke. */
    selectorVersion: { type: String, default: null },
    // No `index: true` here — the TTL index below is on the same `{ at: 1 }`
    // key, so declaring both made Mongoose warn about a duplicate index.
    at: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The alerting query: what broke, where, recently.
diagnosticSchema.index({ at: -1, kind: 1, context: 1 });
// Diagnostics are only useful while fresh; drop them after 30 days so this
// collection can't grow without bound.
diagnosticSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const DiagnosticModel = model('Diagnostic', diagnosticSchema);
