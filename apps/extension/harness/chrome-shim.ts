/**
 * A `chrome` stand-in, just big enough to run the side panel in an ordinary
 * page.
 *
 * The panel is an extension page: it reads chrome.storage.local directly (the
 * "no server-authoritative settings" decision) and asks the service worker for
 * everything else over chrome.runtime.sendMessage. Both of those are stubbed
 * here — storage by an in-memory map with a real onChanged fan-out, messaging
 * by a handler table the scene fills in — so every hook, every onChanged
 * subscription and every refresh path runs exactly as it does in Chrome.
 *
 * Nothing here talks to the network or to a real browser. This module exists
 * only to render marketing screenshots; it is never part of the extension
 * build (see vite.harness.config.ts, a separate entry).
 */

export type MessageHandler = (payload: any, message: any) => unknown | Promise<unknown>;

type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

const store = new Map<string, unknown>();
const changeListeners = new Set<ChangeListener>();
const handlers = new Map<string, MessageHandler>();

const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

const emit = (changes: Record<string, chrome.storage.StorageChange>) => {
  // Async, like the real event — a listener that calls back into storage must
  // not re-enter the set() that triggered it.
  setTimeout(() => {
    for (const fn of changeListeners) fn(changes, 'local');
  }, 0);
};

/** `get(null)`, `get('k')`, `get(['a','b'])` and `get({k: default})` all work. */
const read = (keys: unknown): Record<string, unknown> => {
  if (keys === null || keys === undefined) return Object.fromEntries(store);
  if (typeof keys === 'string') return store.has(keys) ? { [keys]: clone(store.get(keys)) } : {};
  if (Array.isArray(keys)) {
    const out: Record<string, unknown> = {};
    for (const k of keys) if (store.has(k)) out[k] = clone(store.get(k));
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const [k, fallback] of Object.entries(keys as Record<string, unknown>)) {
    out[k] = store.has(k) ? clone(store.get(k)) : fallback;
  }
  return out;
};

const write = (items: Record<string, unknown>) => {
  const changes: Record<string, chrome.storage.StorageChange> = {};
  for (const [k, v] of Object.entries(items)) {
    const oldValue = store.get(k);
    store.set(k, clone(v));
    changes[k] = { oldValue: clone(oldValue), newValue: clone(v) };
  }
  if (Object.keys(changes).length) emit(changes);
};

const drop = (keys: string | string[]) => {
  const list = Array.isArray(keys) ? keys : [keys];
  const changes: Record<string, chrome.storage.StorageChange> = {};
  for (const k of list) {
    if (!store.has(k)) continue;
    changes[k] = { oldValue: clone(store.get(k)) };
    store.delete(k);
  }
  if (Object.keys(changes).length) emit(changes);
};

/** chrome.storage's dual callback/promise signature, on one area. */
const area = () => ({
  get: (keys?: unknown, cb?: (items: Record<string, unknown>) => void) => {
    const result = read(keys ?? null);
    if (cb) {
      cb(result);
      return undefined;
    }
    return Promise.resolve(result);
  },
  set: (items: Record<string, unknown>, cb?: () => void) => {
    write(items);
    if (cb) {
      cb();
      return undefined;
    }
    return Promise.resolve();
  },
  remove: (keys: string | string[], cb?: () => void) => {
    drop(keys);
    if (cb) {
      cb();
      return undefined;
    }
    return Promise.resolve();
  },
  clear: (cb?: () => void) => {
    drop([...store.keys()]);
    if (cb) {
      cb();
      return undefined;
    }
    return Promise.resolve();
  },
  getBytesInUse: () => Promise.resolve(0),
});

const noop = () => undefined;
const event = () => ({ addListener: noop, removeListener: noop, hasListener: () => false });

export const seedStorage = (items: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(items)) store.set(k, clone(v));
};

export const onMessage = (type: string, handler: MessageHandler) => {
  handlers.set(type, handler);
};

/** Read the shim's storage from outside React — used by the message handlers. */
export const shimStorage = {
  get: <T>(key: string): T | undefined => clone(store.get(key)) as T | undefined,
  set: (key: string, value: unknown) => write({ [key]: value }),
};

export const installChromeShim = () => {
  const local = area();
  const chromeShim = {
    storage: {
      local,
      sync: area(),
      session: area(),
      onChanged: {
        addListener: (fn: ChangeListener) => changeListeners.add(fn),
        removeListener: (fn: ChangeListener) => changeListeners.delete(fn),
        hasListener: (fn: ChangeListener) => changeListeners.has(fn),
      },
    },
    runtime: {
      id: 'harness',
      lastError: undefined as { message?: string } | undefined,
      getURL: (p: string) => new URL(p, location.href).toString(),
      getManifest: () => ({ version: '2.1.0' }),
      /**
       * The service worker, as a table. An unhandled type resolves to
       * `{ ok: false }` rather than throwing, which is the same shape the
       * panel already handles when the worker is asleep.
       */
      sendMessage: (message: any, cb?: (resp: unknown) => void) => {
        const run = Promise.resolve()
          .then(() => handlers.get(message?.type)?.(message?.payload ?? {}, message))
          .then((value) => value ?? { ok: false, error: { message: `harness: no handler for ${message?.type}` } });
        if (cb) {
          void run.then((value) => cb(value));
          return undefined;
        }
        return run;
      },
      connect: () => ({
        name: 'harness',
        disconnect: noop,
        postMessage: noop,
        onDisconnect: event(),
        onMessage: event(),
      }),
      onMessage: event(),
      onInstalled: event(),
      onConnect: event(),
      openOptionsPage: noop,
    },
    tabs: {
      create: () => Promise.resolve({ id: 1 }),
      query: () => Promise.resolve([]),
      update: () => Promise.resolve({ id: 1 }),
      remove: () => Promise.resolve(),
      sendMessage: () => Promise.resolve(undefined),
      onUpdated: event(),
      onRemoved: event(),
      onActivated: event(),
    },
    tabGroups: { query: () => Promise.resolve([]), update: () => Promise.resolve({}), get: () => Promise.resolve({}) },
    windows: { update: () => Promise.resolve({}), getCurrent: () => Promise.resolve({ id: 1 }) },
    alarms: { create: noop, clear: () => Promise.resolve(true), onAlarm: event() },
    notifications: { create: noop, clear: noop, onClicked: event(), onButtonClicked: event() },
    identity: { getRedirectURL: () => 'https://harness.invalid/', launchWebAuthFlow: () => Promise.resolve('') },
    sidePanel: { open: () => Promise.resolve(), setPanelBehavior: () => Promise.resolve() },
    commands: { onCommand: event() },
    action: { onClicked: event(), setBadgeText: noop, setBadgeBackgroundColor: noop, setTitle: noop },
  };

  (globalThis as any).chrome = chromeShim;
};
