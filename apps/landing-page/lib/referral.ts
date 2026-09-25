/**
 * Invite links, website side.
 *
 * The Chrome Web Store drops query parameters, so an invite code can't survive
 * the install on its own. The /invite page saves it here in localStorage; on
 * first install the extension opens /welcome, which reads it back and hands it
 * to the extension with chrome.runtime.sendMessage (this site is listed in the
 * extension's externally_connectable). If the extension is already installed,
 * the invite page hands it over directly.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.ghostly247.com";

/** The published extension's ID. For a local unpacked build, set
 *  NEXT_PUBLIC_EXTENSION_ID to the ID shown on chrome://extensions. */
export const EXTENSION_ID =
  process.env.NEXT_PUBLIC_EXTENSION_ID?.trim() || "olfnjmpoacjchlklmdlaimpckblmokga";

const STORAGE_KEY = "ghostly247.inviteCode";

/** Mirrors @casper/shared: 7 characters, no 0/O/1/I/L. */
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$/;

export const normalizeCode = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
};

export interface InviteLookup {
  valid: boolean;
  inviterName: string | null;
  bonusCredits: number;
}

/**
 * Server-side lookup for the invite page and its link preview. Returns null
 * when the API can't be reached or rate-limits us — the page then falls back to
 * a generic invite rather than wrongly calling a real code invalid.
 */
export const lookupInvite = async (code: string): Promise<InviteLookup | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/referral/lookup/${encodeURIComponent(code)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; data?: InviteLookup };
    return body.ok && body.data ? body.data : null;
  } catch {
    return null;
  }
};

// -- browser only -------------------------------------------------------------

export const saveCode = (code: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage blocked (private mode) — the code is on screen to type in */
  }
};

export const readSavedCode = (): string | null => {
  try {
    return normalizeCode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

export const clearSavedCode = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
};

type ChromeRuntime = {
  sendMessage: (id: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
};

/**
 * Hand a code to the extension. Resolves true only when the extension answered
 * that it stored it. `chrome.runtime` exists on this page only when an
 * installed extension lists the site in externally_connectable, so false
 * usually just means "not installed yet".
 */
export const sendCodeToExtension = (code: string, timeoutMs = 1500): Promise<boolean> =>
  new Promise((resolve) => {
    const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
    if (!runtime?.sendMessage) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => resolve(false), timeoutMs);
    try {
      runtime.sendMessage(EXTENSION_ID, { type: "REFERRAL", code }, (response) => {
        clearTimeout(timer);
        // Reading lastError marks it handled (no console noise when not installed).
        const failed = Boolean(runtime.lastError);
        resolve(!failed && (response as { ok?: boolean } | undefined)?.ok === true);
      });
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
