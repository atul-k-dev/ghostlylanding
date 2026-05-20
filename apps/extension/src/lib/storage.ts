import type { User, ExtensionSettings } from '@casper/shared';

export const STORAGE_KEYS = {
  auth: 'casper.auth',
  settings: 'casper.settings',
  counters: 'casper.counters',
} as const;

export interface StoredAuth {
  token: string;
  user: User;
  savedAt: string;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  isPaused: false,
  targetCreators: [],
  whitelist: [],
  caps: {
    twitter: { likesPerDay: 80, commentsPerDay: 20, followsPerDay: 30 },
    linkedin: { likesPerDay: 50, commentsPerDay: 15, followsPerDay: 15 },
  },
};

export const getAuth = async (): Promise<StoredAuth | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.auth);
  return (got[STORAGE_KEYS.auth] as StoredAuth | undefined) ?? null;
};

export const setAuth = async (auth: StoredAuth | null): Promise<void> => {
  if (auth === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.auth);
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.auth]: auth });
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return (got[STORAGE_KEYS.settings] as ExtensionSettings | undefined) ?? DEFAULT_SETTINGS;
};

export const setSettings = async (settings: ExtensionSettings): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
};
