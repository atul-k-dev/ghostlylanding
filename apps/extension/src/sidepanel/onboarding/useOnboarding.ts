import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../lib/storage.js';

/**
 * Onboarding progress, kept in chrome.storage.local so it survives the panel
 * closing: the step reached, the goal chosen (it tunes later recommendations),
 * and whether the user chose "later". Completion itself is the settings'
 * `setupCompletedAt`, which the engine already reads.
 */
export const STEPS = [
  'welcome',
  'goal',
  'account',
  'topics',
  'people',
  'actions',
  'voice',
  'posting',
  'pace',
  'look',
  'preview',
  'ready',
] as const;
export type StepId = (typeof STEPS)[number];

export type Goal = 'followers' | 'engagement' | 'authority' | 'promote';

export interface OnboardingProgress {
  step: StepId;
  goal: Goal | null;
  /** Set when the user picked "I'll do it later" — the app opens normally. */
  skippedAt: number | null;
}

const DEFAULT: OnboardingProgress = { step: 'welcome', goal: null, skippedAt: null };

const read = async (): Promise<OnboardingProgress> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.onboarding);
  return { ...DEFAULT, ...((got[STORAGE_KEYS.onboarding] as Partial<OnboardingProgress> | undefined) ?? {}) };
};

export const saveOnboarding = async (patch: Partial<OnboardingProgress>) => {
  const next = { ...(await read()), ...patch };
  await chrome.storage.local.set({ [STORAGE_KEYS.onboarding]: next });
  return next;
};

export const useOnboarding = () => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    void read().then(setProgress);
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.onboarding in changes) void read().then(setProgress);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return {
    progress,
    /** 0–1 through the steps, for "Finish setting up" cards. */
    fraction: progress ? STEPS.indexOf(progress.step) / (STEPS.length - 1) : 0,
    save: (patch: Partial<OnboardingProgress>) => {
      setProgress((p) => (p ? { ...p, ...patch } : p));
      void saveOnboarding(patch);
    },
  };
};
