/**
 * One entry per screenshot the landing page asks for.
 *
 * `out` is the exact file and size `apps/new-landing/lib/media.ts` documents;
 * `panel` is the width the side panel is laid out at before it is scaled onto
 * that canvas, so a landscape shot gets a genuinely wider panel rather than a
 * narrow one stretched.
 *
 * `drive` runs after the first paint, in the panel's own document. It only ever
 * clicks what a user would click — a nav button, a tab, a suggestion — so the
 * shot is a real render of a real state, never a prop.
 */
import { STORAGE_KEYS } from '../src/lib/storage.js';
import { pendingReplies } from './fixtures.js';

export type View =
  | { kind: 'app' }
  | { kind: 'settings'; route: 'voice' | 'limits' | 'topics' | 'targets' | 'homeFeed' }
  | { kind: 'notifications' }
  | { kind: 'onboarding' };

export interface Scene {
  id: string;
  /** Path under apps/new-landing/public/ — the contract in media.ts. */
  out: string;
  width: number;
  height: number;
  view: View;
  /** Panel layout size in CSS px, before scaling onto the canvas. */
  panel: { width: number; height: number };
  storage?: Record<string, unknown>;
  /** Clicks/scrolls to run in the panel document once it has settled. */
  drive?: string[];
}

/** Click the first element whose accessible name or text matches exactly. */
const click = (text: string) => `click:${text}`;
/** Scroll the panel's scroll container so the match sits at the top. */
const scrollTo = (text: string) => `scroll:${text}`;
/** Type into Ask's composer and send it. */
const type = (text: string) => `ask:${text}`;

export const SCENES: Scene[] = [
  {
    id: 'hero-side-panel',
    out: 'product/hero-side-panel.png',
    width: 1200,
    height: 1200,
    view: { kind: 'app' },
    panel: { width: 440, height: 900 },
  },
  {
    id: 'step-run',
    out: 'product/step-run.png',
    width: 900,
    height: 700,
    view: { kind: 'app' },
    panel: { width: 440, height: 760 },
  },
  {
    id: 'activity-log',
    out: 'product/activity-log.png',
    width: 1400,
    height: 900,
    view: { kind: 'app' },
    panel: { width: 640, height: 900 },
    drive: [click('Done'), scrollTo('What I’m doing')],
  },
  {
    id: 'growth-scoreboard',
    out: 'product/growth-scoreboard.png',
    width: 1400,
    height: 1000,
    view: { kind: 'app' },
    panel: { width: 640, height: 1000 },
    drive: [scrollTo('Followers')],
  },
  {
    id: 'review-queue',
    out: 'product/review-queue.png',
    width: 1000,
    height: 1100,
    view: { kind: 'notifications' },
    panel: { width: 460, height: 940 },
    storage: { [STORAGE_KEYS.pendingReplies]: pendingReplies },
  },
  {
    id: 'ask-proposal',
    out: 'product/ask-proposal.png',
    width: 1200,
    height: 1200,
    view: { kind: 'app' },
    panel: { width: 440, height: 820 },
    drive: [click('Ask'), click('Which creators work best?'), type('Stop following people for now')],
  },
  {
    id: 'voice-training',
    out: 'product/voice-training.png',
    width: 1200,
    height: 1200,
    view: { kind: 'settings', route: 'voice' },
    panel: { width: 440, height: 570 },
  },
  {
    id: 'pillar-voice',
    out: 'product/pillar-voice.png',
    width: 720,
    height: 900,
    view: { kind: 'settings', route: 'voice' },
    panel: { width: 420, height: 545 },
  },
  {
    id: 'pillar-safety',
    out: 'product/pillar-safety.png',
    width: 720,
    height: 900,
    view: { kind: 'settings', route: 'limits' },
    panel: { width: 420, height: 880 },
    drive: [scrollTo('Daily safety limits')],
  },
  {
    id: 'composer-thread',
    out: 'product/composer-thread.png',
    width: 1200,
    height: 1200,
    view: { kind: 'app' },
    panel: { width: 440, height: 900 },
    drive: [click('Post')],
  },
  {
    id: 'targeting-feeds',
    out: 'product/targeting-feeds.png',
    width: 1200,
    height: 1200,
    view: { kind: 'settings', route: 'topics' },
    panel: { width: 440, height: 900 },
  },
  {
    id: 'step-setup',
    out: 'product/step-setup.png',
    width: 900,
    height: 700,
    view: { kind: 'onboarding' },
    panel: { width: 440, height: 900 },
    storage: { [STORAGE_KEYS.onboarding]: { step: 'goal', goals: [], skippedAt: null } },
  },
];

export const sceneById = (id: string): Scene | undefined => SCENES.find((s) => s.id === id);
