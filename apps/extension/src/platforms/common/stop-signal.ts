/**
 * The kill switch, as the content script sees it — instantly.
 *
 * Pausing flips `settings.isPaused` in storage. Polling it only at a few
 * checkpoints (as the feed loop used to) left Ghostly scrolling and reading
 * for a minute or more after the user hit Pause. This keeps a synchronous
 * flag fed by `storage.onChanged`, so every loop can check it for free and
 * every wait can end the moment it flips.
 *
 * Only for runs that ACT on X. A dry run and setup's account reading are
 * meant to work while paused, and don't consult this.
 */
const SETTINGS_KEY = 'casper.settings'; // mirrors STORAGE_KEYS.settings

let paused = false;

try {
  void chrome.storage.local.get(SETTINGS_KEY).then((got) => {
    paused = (got[SETTINGS_KEY] as { isPaused?: boolean } | undefined)?.isPaused === true;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(SETTINGS_KEY in changes)) return;
    paused = (changes[SETTINGS_KEY]!.newValue as { isPaused?: boolean } | undefined)?.isPaused === true;
  });
} catch {
  /* not in an extension context (the smoke suite) — never paused */
}

/** True the moment the user pauses. */
export const isStopped = (): boolean => paused;

/** Refresh from storage — for the start of a run, before the listener has fired. */
export const syncStopSignal = async (): Promise<boolean> => {
  try {
    const got = await chrome.storage.local.get(SETTINGS_KEY);
    paused = (got[SETTINGS_KEY] as { isPaused?: boolean } | undefined)?.isPaused === true;
  } catch {
    /* keep the last known value */
  }
  return paused;
};

/** Wait `ms`, but return early the moment Ghostly is paused. Resolves true if it was. */
export const stoppableWait = async (ms: number, respect = true): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (respect && paused) return true;
    await new Promise((r) => setTimeout(r, Math.min(200, end - Date.now())));
  }
  return respect && paused;
};
