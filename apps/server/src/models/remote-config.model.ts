import { Schema, model } from 'mongoose';

/**
 * A single document holding live overrides that must not wait for a deploy.
 *
 * Exists for one scenario: X changes its DOM, every user's automation stops, and
 * we want the fix out in the next minute rather than the next deploy. An admin
 * PUTs the corrected selectors here and they're merged on top of the file-based
 * defaults. Normally this document doesn't exist at all.
 */
const remoteConfigSchema = new Schema(
  {
    /** Always 'twitter-selectors' — this collection holds one row per config kind. */
    key: { type: String, required: true, unique: true, index: true },
    /** Selector key → CSS selector. Validated against SELECTOR_KEYS on write. */
    selectors: { type: Map, of: String, default: () => new Map<string, string>() },
    /** Version string served to clients; bumped on every write. */
    version: { type: String, required: true },
    /** Who last changed it, for the audit trail during an incident. */
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const SELECTOR_CONFIG_KEY = 'twitter-selectors';

export const RemoteConfigModel = model('RemoteConfig', remoteConfigSchema);
