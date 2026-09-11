import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { getSettings, setSettings, STORAGE_KEYS } from '../../lib/storage.js';

/**
 * One live copy of the settings for the whole Settings screen. Writes are
 * optimistic; storage changes made elsewhere (the engine, the floating panel)
 * flow back in, so a stale copy never overwrites a newer value.
 */
export const useSettingsStore = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setLocal);
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.settings in changes) void getSettings().then(setLocal);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const update = (next: ExtensionSettings) => {
    setLocal(next);
    void setSettings(next);
  };

  return { settings, update, reload: () => void getSettings().then(setLocal) };
};
