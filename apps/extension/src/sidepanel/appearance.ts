import { useEffect, useState } from 'react';

/**
 * Appearance — light/dark/system, a base colour and a theme colour, all from
 * the shadcn registry (appearance-palettes.css). It is a per-device display
 * preference, so it lives in localStorage: synchronous, which means it can be
 * applied before the first paint and the panel never flashes the wrong theme.
 */
export type ThemeMode = 'light' | 'dark' | 'system';
export const BASE_COLORS = ['neutral', 'stone', 'zinc', 'mauve', 'olive', 'mist', 'taupe'] as const;
export type BaseColor = (typeof BASE_COLORS)[number];
export const ACCENT_COLORS = [
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
  mode: 'dark',
  base: 'neutral',
  accent: 'base',
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

export const label = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export const readAppearance = (): Appearance => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<Appearance>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export const applyAppearance = (a: Appearance = readAppearance()) => {
  const root = document.documentElement;
  const dark = a.mode === 'dark' || (a.mode === 'system' && systemDark());
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.base = a.base;
  if (a.accent === 'base') delete root.dataset.accent;
  else root.dataset.accent = a.accent;
  root.dataset.border = a.borders ? a.borderColor : 'none';
  root.dataset.radius = a.radius;
  root.dataset.shadow = a.shadows ? 'on' : 'none';
  root.dataset.divider = a.dividers ? a.dividerColor : 'none';
  root.style.setProperty('--border-custom', a.customBorder);
  root.style.setProperty('--divider-custom', a.customDivider);
  // Cards are rounded-2xl = --radius × 1.8, so this makes a card corner exactly customRadius px.
  root.style.setProperty('--radius-custom', `${a.customRadius / 1.8}px`);
};

export const saveAppearance = (a: Appearance) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Storage blocked — still apply for this session.
  }
  applyAppearance(a);
  window.dispatchEvent(new Event(EVENT));
};

/** Apply now, and keep following the OS while the mode is 'system'. */
export const initAppearance = () => {
  applyAppearance();
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => readAppearance().mode === 'system' && applyAppearance());
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
