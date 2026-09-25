import { normalizeReferralCode } from '@casper/shared';

/**
 * The website side of invites. The Chrome Web Store drops query parameters, so
 * an invite code can't ride along through the install. Instead:
 *
 *   1. https://<SITE>/invite/<CODE> saves the code in the site's localStorage
 *      (and, if the extension is already installed, sends it straight here);
 *   2. on first install the extension opens https://<SITE>/welcome, which reads
 *      that saved code and sends it here with chrome.runtime.sendMessage;
 *   3. the background checks who sent it and parks it for the sign-up form.
 */

// `import.meta.env` is undefined when this module runs under plain Node (the
// smoke scripts), so read it defensively.
export const SITE_URL: string = import.meta.env?.VITE_SITE_URL ?? 'https://www.ghostly247.com';

/**
 * Origins whose pages may hand us a code: exactly the manifest's
 * externally_connectable (which is what lets them message us at all), so a
 * store build and a local build each trust what their own manifest lists and
 * nothing else. Falls back to the configured site outside an extension.
 */
export const allowedSiteOrigins = (): string[] => {
  try {
    const matches = chrome.runtime.getManifest().externally_connectable?.matches ?? [];
    const origins = matches.map((m) => new URL(m.replace(/\*$/, '')).origin);
    if (origins.length > 0) return origins;
  } catch {
    /* not running as an extension (smoke scripts) */
  }
  return [new URL(SITE_URL).origin];
};

/**
 * Validate an externally-sent message: from an allowed origin, shaped
 * `{ type: 'REFERRAL', code }`, with a well-formed code. Returns the code, or
 * null for anything else.
 */
export const referralFromExternalMessage = (
  message: unknown,
  senderOrigin: string | undefined,
  origins: string[] = allowedSiteOrigins(),
): string | null => {
  if (!senderOrigin || !origins.includes(senderOrigin)) return null;
  if (!message || typeof message !== 'object') return null;
  const m = message as { type?: unknown; code?: unknown };
  if (m.type !== 'REFERRAL' || typeof m.code !== 'string') return null;
  return normalizeReferralCode(m.code);
};
