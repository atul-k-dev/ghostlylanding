/**
 * Client configuration the extension pulls at runtime.
 *
 * Right now that's the DOM selector overrides. The response is deliberately
 * boring and small: a version string and a partial selector map. The extension
 * treats it as advisory — it validates every value and falls back to its bundled
 * map for anything missing, invalid, or unknown.
 */
import { Router } from 'express';
import { ok } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import {
  SELECTOR_OVERRIDES,
  SELECTOR_VERSION,
  MIN_EXTENSION_VERSION,
  isSelectorKey,
} from '../config/selectors.js';
import { RemoteConfigModel, SELECTOR_CONFIG_KEY } from '../models/remote-config.model.js';

export const configRouter = Router();

/**
 * File defaults, with any DB override merged on top. The DB row is the
 * break-glass path during an X DOM incident (no deploy needed); when it doesn't
 * exist — the normal state — this is just the file.
 */
export const resolveSelectorConfig = async (): Promise<{
  version: string;
  selectors: Record<string, string>;
}> => {
  const selectors: Record<string, string> = { ...SELECTOR_OVERRIDES };
  let version = SELECTOR_VERSION;

  const live = await RemoteConfigModel.findOne({ key: SELECTOR_CONFIG_KEY }).lean();
  if (live?.selectors) {
    // `selectors` is a Map in the schema; .lean() gives a plain object.
    for (const [key, value] of Object.entries(live.selectors as Record<string, string>)) {
      if (isSelectorKey(key) && typeof value === 'string' && value.trim()) {
        selectors[key] = value;
      }
    }
    if (live.version) version = live.version;
  }
  return { version, selectors };
};

configRouter.get(
  '/selectors',
  requireAuth,
  // Fetched on service-worker boot and every 6h. A browser that restarts a lot
  // is the only heavy caller, and 30/min/user covers it comfortably.
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `selcfg:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (_req, res) => {
    const config = await resolveSelectorConfig();
    res.json(ok({ ...config, minExtensionVersion: MIN_EXTENSION_VERSION }));
  }),
);
