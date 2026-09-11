import { useEffect, useState } from 'react';

/**
 * Appearance — light/dark/system, base and theme colour (shadcn registry
 * palettes in ui/appearance-palettes.css), borders, separators, shadows and
 * corner radius. Stored in chrome.storage.local so the floating panel on x.com
 * follows it too; the side panel keeps a localStorage copy to apply before
 * its first paint.
 */
export type ThemeMode = 'light' | 'dark' | 'system';
export const BASE_COLORS = ['neutral', 'stone', 'zinc', 'mauve', 'olive', 'mist', 'taupe', 'twitter'] as const;
export type BaseColor = (typeof BASE_COLORS)[number];
export const ACCENT_COLORS = [
  'twitter',
  'amber',
  'blue',
  'cyan',
  'emerald',
  'fuchsia',
  'green',
  'indigo',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'rose',
  'sky',
  'teal',
  'violet',
  'yellow',
] as const;
/** 'base' = no accent: the theme colour follows the base colour. */
export type AccentColor = 'base' | (typeof ACCENT_COLORS)[number];

export const BORDER_COLORS = ['default', 'subtle', 'strong', 'accent', 'custom'] as const;
export type BorderColor = (typeof BORDER_COLORS)[number];
export const RADII = ['none', 'small', 'medium', 'large', 'custom'] as const;
export const CUSTOM_RADIUS_MAX = 40;
/** 'default' = the preset's own radius. */
export type Radius = 'default' | (typeof RADII)[number];

export interface Appearance {
  mode: ThemeMode;
  base: BaseColor;
  accent: AccentColor;
  borders: boolean;
  borderColor: BorderColor;
  /** Hex, used when borderColor is 'custom'. */
  customBorder: string;
  /** The hairlines between rows inside a card — separate from card borders. */
  dividers: boolean;
  dividerColor: BorderColor;
  customDivider: string;
  shadows: boolean;
  radius: Radius;
  /** Card corner radius in px (0–40), used when radius is 'custom'. */
  customRadius: number;
}

const KEY = 'casper.appearance';
const DEFAULT: Appearance = {
  mode: 'light',
  base: 'mist',
  accent: 'twitter',
  borders: true,
  borderColor: 'default',
  customBorder: '#8b5cf6',
  dividers: true,
  dividerColor: 'default',
  customDivider: '#8b5cf6',
  shadows: true,
  radius: 'default',
  customRadius: 18,
};
const EVENT = 'casper:appearance';
/** Shared with the floating panel on x.com, which can't see this page's localStorage. */
const STORE_KEY = 'casper.appearance';

export const label = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const merge = (raw: unknown): Appearance =>
  raw && typeof raw === 'object' ? { ...DEFAULT, ...(raw as Partial<Appearance>) } : DEFAULT;

/**
 * The side panel's synchronous copy — read before the first paint so the panel
 * never flashes the wrong theme. chrome.storage.local is the source of truth.
 */
export const readAppearance = (): Appearance => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? merge(JSON.parse(raw)) : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

const cache = (a: Appearance) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Storage blocked — it still applies for this session.
  }
};

const loadStored = async (): Promise<Appearance | null> => {
  try {
    const got = await chrome.storage.local.get(STORE_KEY);
    return got[STORE_KEY] ? merge(got[STORE_KEY]) : null;
  } catch {
    return null;
  }
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Apply to the side panel's <html>, or to the floating panel's layer element. */
export const applyAppearance = (a: Appearance = readAppearance(), el: HTMLElement = document.documentElement) => {
  const dark = a.mode === 'dark' || (a.mode === 'system' && systemDark());
  el.classList.toggle('dark', dark);
  el.style.colorScheme = dark ? 'dark' : 'light';
  el.dataset.base = a.base;
  if (a.accent === 'base') delete el.dataset.accent;
  else el.dataset.accent = a.accent;
  el.dataset.border = a.borders ? a.borderColor : 'none';
  el.dataset.radius = a.radius;
  el.dataset.shadow = a.shadows ? 'on' : 'none';
  el.dataset.divider = a.dividers ? a.dividerColor : 'none';
  el.style.setProperty('--border-custom', a.customBorder);
  el.style.setProperty('--divider-custom', a.customDivider);
  // Cards are rounded-2xl = --radius × 1.8, so this makes a card corner exactly customRadius px.
  el.style.setProperty('--radius-custom', `${a.customRadius / 1.8}px`);
};

export const saveAppearance = (a: Appearance) => {
  cache(a);
  applyAppearance(a);
  window.dispatchEvent(new Event(EVENT));
  void chrome.storage.local.set({ [STORE_KEY]: a }).catch(() => {});
};

/**
 * Side panel: apply the cached copy now, then reconcile with the shared store
 * (and migrate a cache-only value into it), and follow changes made elsewhere
 * and the OS theme while the mode is 'system'.
 */
export const initAppearance = () => {
  applyAppearance();
  void loadStored().then((stored) => {
    if (!stored) {
      void chrome.storage.local.set({ [STORE_KEY]: readAppearance() }).catch(() => {});
      return;
    }
    if (JSON.stringify(stored) !== JSON.stringify(readAppearance())) {
      cache(stored);
      applyAppearance(stored);
      window.dispatchEvent(new Event(EVENT));
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORE_KEY in changes)) return;
    const next = merge(changes[STORE_KEY]!.newValue);
    if (JSON.stringify(next) === JSON.stringify(readAppearance())) return;
    cache(next);
    applyAppearance(next);
    window.dispatchEvent(new Event(EVENT));
  });
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => readAppearance().mode === 'system' && applyAppearance());
};

/** Floating panel: keep `el` in step with the side panel's Appearance, live. */
export const watchAppearance = (el: HTMLElement, onApply?: () => void) => {
  let current = DEFAULT;
  const apply = () => {
    applyAppearance(current, el);
    onApply?.();
  };
  apply();
  void loadStored().then((stored) => {
    current = stored ?? DEFAULT;
    apply();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORE_KEY in changes)) return;
    current = merge(changes[STORE_KEY]!.newValue);
    apply();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => current.mode === 'system' && apply());
};

export const useAppearance = (): [Appearance, (patch: Partial<Appearance>) => void] => {
  const [value, setValue] = useState(readAppearance);
  useEffect(() => {
    const sync = () => setValue(readAppearance());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [value, (patch) => saveAppearance({ ...readAppearance(), ...patch })];
};
