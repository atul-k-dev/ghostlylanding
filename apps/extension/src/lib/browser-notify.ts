/**
 * Browser notifications (updateplan 4.3) — a Chrome-level alert, not the panel.
 *
 * Reserved for decaying moments: something the user would want to know about
 * even with the panel closed, and where knowing five minutes late is worse
 * than knowing five minutes early. Everything else stays in the panel, where
 * it belongs — a product that pings you for routine activity is a product you
 * mute within a week, and then it never gets your attention for the moment it
 * actually mattered.
 *
 * **The cap is enforced HERE, in code, regardless of settings.** `problems`
 * and `bigReplies` decide whether a CLASS of alert is allowed to fire at all;
 * they can never raise `MAX_PER_DAY`.
 */
import { STORAGE_KEYS, getSettings } from './storage.js';

/** Hard ceiling, both classes combined. Never raised by a setting. */
export const MAX_NOTIFICATIONS_PER_DAY = 2;

/** "A big account" — chosen so an everyday mention never qualifies; the plan's
 *  own example (40k) is well clear of it. */
export const BIG_ACCOUNT_FOLLOWERS = 10_000;

/** How long signed-out has to hold before it's worth interrupting someone for. */
export const SIGNED_OUT_NOTIFY_AFTER_MS = 2 * 60 * 60 * 1000;

interface NotifyState {
  /** YYYY-MM-DD (UTC) — a coarse day boundary is fine for a courtesy cap. */
  date: string;
  sent: number;
  /** `since` (ms) of the signed-out episode we've already notified about, so a
   *  single long episode fires once, not every time this is checked. */
  notifiedSignedOutSince: number | null;
}

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

/**
 * Roll a stored budget forward onto `day`. Pure, and the one place the cap
 * arithmetic lives — `scripts/browser-notify-smoke.mts` pins it directly so the
 * ceiling can never quietly drift.
 */
export const rolloverState = (
  stored: Partial<NotifyState> | undefined,
  day: string,
): NotifyState => ({
  date: day,
  // A stored count from a previous day is stale — today starts at zero.
  sent: stored?.date === day ? (stored.sent ?? 0) : 0,
  notifiedSignedOutSince: stored?.notifiedSignedOutSince ?? null,
});

/** Is there a slot left today? Pure — the hard ceiling, checked in one place. */
export const hasSlotLeft = (state: Pick<NotifyState, 'sent'>): boolean =>
  state.sent < MAX_NOTIFICATIONS_PER_DAY;

const getState = async (): Promise<NotifyState> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.notifyState);
  const stored = got[STORAGE_KEYS.notifyState] as Partial<NotifyState> | undefined;
  return rolloverState(stored, todayUtc());
};

const setState = async (state: NotifyState): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.notifyState]: state });
};

/** Claim one of today's slots. False means the cap is already spent. */
const claimSlot = async (): Promise<boolean> => {
  const state = await getState();
  if (!hasSlotLeft(state)) return false;
  await setState({ ...state, sent: state.sent + 1 });
  return true;
};

interface NotifyArgs {
  /** Stable per-purpose id — a second call with the same id replaces the first
   *  rather than stacking a duplicate. */
  id: string;
  title: string;
  message: string;
  /** Opened in a new tab if the user clicks the notification. */
  onClickUrl?: string;
}

const pendingUrls = new Map<string, string>();
let clickListenerInstalled = false;

const ensureClickListener = (): void => {
  if (clickListenerInstalled || typeof chrome === 'undefined' || !chrome.notifications) return;
  chrome.notifications.onClicked.addListener((id) => {
    const url = pendingUrls.get(id);
    if (url) void chrome.tabs.create({ url, active: true });
    pendingUrls.delete(id);
    chrome.notifications.clear(id);
  });
  clickListenerInstalled = true;
};

/**
 * Fire a browser notification, spending one of today's slots.
 *
 * Returns false (and does nothing) when the daily cap is spent, the extension
 * doesn't have the permission for some reason, or this isn't a context that
 * has `chrome.notifications` at all (the smoke suite, most obviously) — never
 * throws, because a missed courtesy alert is not worth a broken tick.
 */
const notify = async (args: NotifyArgs): Promise<boolean> => {
  if (typeof chrome === 'undefined' || !chrome.notifications) return false;
  if (!(await claimSlot())) return false;
  ensureClickListener();
  if (args.onClickUrl) pendingUrls.set(args.id, args.onClickUrl);
  try {
    await chrome.notifications.create(args.id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: args.title,
      message: args.message,
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * "I've been signed out of X for 2 hours — nothing's running."
 *
 * Called with the CURRENT block reason on every tick that reports one. Fires
 * once per continuous signed-out episode — keyed on `since`, so resolving it
 * and going signed-out again later is a new episode and gets its own alert.
 */
export const maybeNotifySignedOut = async (
  blockReason: { code: string; since: number } | null,
): Promise<void> => {
  if (!blockReason || blockReason.code !== 'signed-out') return;
  if (Date.now() - blockReason.since < SIGNED_OUT_NOTIFY_AFTER_MS) return;

  const settings = await getSettings();
  if (!settings.notifications.problems) return;

  const state = await getState();
  if (state.notifiedSignedOutSince === blockReason.since) return;

  const sent = await notify({
    id: 'ghostly247-signed-out',
    title: 'Ghostly247',
    message: "I've been signed out of X for 2 hours — nothing's running.",
    onClickUrl: 'https://x.com/home',
  });
  if (sent) {
    const fresh = await getState();
    await setState({ ...fresh, notifiedSignedOutSince: blockReason.since });
  }
};

/**
 * The engine auto-paused itself because it can no longer read the timeline
 * (the selector-break circuit breaker) — the other "something is broken"
 * moment 4.3 names. Fires once per pause event; `scheduler.ts` only reaches
 * this path once per crossing of the breaker's threshold, so no extra dedupe
 * is needed beyond the shared daily cap.
 */
export const maybeNotifyAutoPause = async (detail: string): Promise<void> => {
  const settings = await getSettings();
  if (!settings.notifications.problems) return;
  await notify({
    id: 'ghostly247-auto-pause',
    title: 'Ghostly247 paused itself',
    message: detail,
    onClickUrl: 'https://x.com/home',
  });
};

/**
 * "@someone with 40k followers just replied to you. Want me to answer?"
 *
 * Called once, right when a big-account mention lands in the REVIEW queue —
 * never for one that auto-published, because there is nothing left to ask.
 * The dedupe against drafting the same mention twice already lives in
 * `executor.ts`'s mentions scan, so this only ever fires once per mention.
 */
export const maybeNotifyBigReply = async (mention: {
  authorHandle: string | null;
  authorFollowers: number | null;
  postUrl: string;
}): Promise<void> => {
  if ((mention.authorFollowers ?? 0) < BIG_ACCOUNT_FOLLOWERS) return;

  const settings = await getSettings();
  if (!settings.notifications.bigReplies) return;

  const who = mention.authorHandle ? `@${mention.authorHandle.replace(/^@/, '')}` : 'Someone';
  const followers = (mention.authorFollowers ?? 0).toLocaleString();
  await notify({
    id: `ghostly247-big-reply-${mention.postUrl}`,
    title: 'Ghostly247',
    message: `${who} (${followers} followers) just replied to you. Want me to answer?`,
    onClickUrl: mention.postUrl,
  });
};
