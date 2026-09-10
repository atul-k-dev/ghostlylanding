/**
 * The condition table (updateplan 1.7).
 *
 * Fifteen states the user can be in when Ghostly247 isn't working, or when it
 * needs a decision. Eleven are ENGINE states — `casper.blockReason`, resolved by
 * `scheduler/block-reason.ts`. Four are NOTICE states, which are not reasons the
 * engine is idle at all: the engine can be running perfectly while any of them
 * is true, and each has its own source (pending replies, the newest publish, a
 * failed scheduled post).
 *
 * Every string here is copied verbatim from `docs/ui-copy.md`, placeholders and
 * ASCII apostrophes included. That doc is the source of truth and the copy is
 * FIXED — `scripts/conditions-smoke.mts` parses the doc's tables and fails the
 * build if a single character here drifts from it. If a string reads wrong,
 * change the doc and let the test tell you what to change here; do not reword it
 * in passing.
 *
 * This module is deliberately pure — no React, no chrome APIs — so the smoke
 * suite can drive all fifteen states in plain node, and so Phase 2's floating
 * panel can render the same table without importing the side panel.
 */
import type { BlockReasonCode } from '../scheduler/block-reason.js';
import type { PanelTarget } from './navigation.js';

/**
 * The four notice states. NOT `BlockReasonCode`s and never to be folded into
 * them — see the doc's section B.
 */
export type NoticeCode = 'post-failed' | 'image-failed' | 'drafts-waiting' | 'profile-quiet';

export type ConditionCode = BlockReasonCode | NoticeCode;

/**
 * `calm` is a normal status line — resting, quiet feed, drafts waiting.
 * `attention` is the one card that means something needs the user. Never style
 * a calm state as an error; `nothing-matched` in particular is the difference
 * between a quiet colleague and a dead one.
 */
export type CardTone = 'attention' | 'calm';

/** What a card's button does. Resolved by the renderer, not here. */
export type CardAction =
  | { label: string; kind: 'nav'; to: PanelTarget }
  | { label: string; kind: 'start' }
  | { label: string; kind: 'open-x' }
  | { label: string; kind: 'billing' }
  | { label: string; kind: 'tell-us' }
  | { label: string; kind: 'write-two' }
  /** Put a failed scheduled post back on the schedule, with or without its image. */
  | { label: string; kind: 'retry-post'; postId: string; dropImage: boolean };

/** One row of the table, before its placeholders are filled. */
export interface CopyRow {
  title: string;
  /** Null where the doc says the title is the whole message. */
  body: string | null;
  /** Button labels, in order. Two states have none; one has two. */
  buttons: readonly string[];
  tone: CardTone;
}

/** A card ready to render. */
export interface Card {
  code: ConditionCode;
  title: string;
  body: string | null;
  actions: CardAction[];
  tone: CardTone;
}

/* -- A. Engine states (11) -------------------------------------------------- */

export const ENGINE_COPY: Record<BlockReasonCode, CopyRow> = {
  'not-configured': {
    title: "I don't know who to watch yet.",
    body: "Give me a topic and I'll start today.",
    buttons: ['Set me up'],
    tone: 'attention',
  },
  'feed-off': {
    title: "Your {n} topics aren't running.",
    body: "Turn on engagement and I'll start working them.",
    buttons: ['Turn it on'],
    tone: 'attention',
  },
  // No button on purpose: there is nothing to press, and the resume time is the
  // answer to the only question the user has.
  'caps-spent': {
    title: 'Done for today.',
    body: "I've used today's safe limit — back at {resumeTime}.",
    buttons: [],
    tone: 'calm',
  },
  'outside-hours': {
    title: 'Resting until {startHour}.',
    body: 'Running at 4am is the most machine-like thing there is.',
    buttons: ['Change hours'],
    tone: 'calm',
  },
  'signed-out': {
    title: "I can't see your account.",
    body: "Sign in to X and I'll pick straight back up.",
    buttons: ['Open X'],
    tone: 'attention',
  },
  'free-cap': {
    title: "You've used your {n} free actions this month.",
    body: 'They reset on the 1st.',
    buttons: ['See plans'],
    tone: 'calm',
  },
  'sub-lapsed': {
    title: "Your plan ended, so I've stopped.",
    body: "Everything's saved — nothing's lost.",
    buttons: ['Restart it'],
    tone: 'attention',
  },
  degraded: {
    title: "X changed something and I can't read the feed.",
    body: "I've stopped rather than guess. I'll retry automatically.",
    buttons: ['Tell us'],
    tone: 'attention',
  },
  // Also deliberately buttonless: a fake "Retry" would be worse than silence,
  // and the second line is what stops the support ticket.
  'server-unreachable': {
    title: "Can't reach Ghostly — replies are paused.",
    body: 'Likes and follows are still running.',
    buttons: [],
    tone: 'calm',
  },
  paused: {
    title: 'Resting.',
    body: "Nothing's running.",
    buttons: ['Start'],
    tone: 'calm',
  },
  'nothing-matched': {
    title: 'Skipped {n} posts — nothing matched your topics.',
    body: "Feed's quiet right now.",
    buttons: ['Widen my topics'],
    tone: 'calm',
  },
};

/* -- B. Notice states (4) --------------------------------------------------- */

export const NOTICE_COPY: Record<NoticeCode, CopyRow> = {
  'drafts-waiting': {
    title: '{n} replies ready for you.',
    body: null,
    buttons: ['Review them'],
    tone: 'calm',
  },
  'profile-quiet': {
    title: "Your profile's gone quiet.",
    body: 'I sent {n} people there this week. Want me to write something?',
    buttons: ['Write two for me'],
    tone: 'calm',
  },
  'post-failed': {
    title: "{weekday}'s post didn't go out — the browser restarted mid-publish.",
    body: 'Nothing was double-posted.',
    buttons: ['Try again'],
    tone: 'attention',
  },
  'image-failed': {
    title: "I didn't post it — the image wouldn't attach.",
    body: "I won't send it without one.",
    buttons: ['Post without image', 'Retry'],
    tone: 'attention',
  },
};

/* -- filling the placeholders ---------------------------------------------- */

export type CopyVars = Record<string, string | number | null | undefined>;

/**
 * Replace `{name}` with its value.
 *
 * A sentence whose placeholder has NO value is dropped whole, rather than
 * rendered with a hole or a guessed number — that is the doc's rule for the
 * profile-quiet card ("if we don't have the figure, drop the sentence entirely
 * rather than guessing a number"), and it is the only safe behaviour for any
 * other number we might not have.
 */
export const fill = (template: string, vars: CopyVars): string | null => {
  const sentences = template.split(/(?<=\.)\s+/);
  const kept = sentences.filter((s) =>
    [...s.matchAll(/\{(\w+)\}/g)].every(([, key]) => {
      const value = key === undefined ? undefined : vars[key];
      return value !== null && value !== undefined;
    }),
  );
  if (kept.length === 0) return null;
  return kept
    .join(' ')
    .replace(/\{(\w+)\}/g, (_m: string, key: string) => String(vars[key] ?? ''))
    .trim();
};

/* -- which card wins -------------------------------------------------------- */

/** Everything the notice states are computed from. All of it plain data. */
export interface NoticeInput {
  /** Scheduled posts that failed, in any order. */
  failedPosts: readonly { id: string; scheduledAt: number; error?: string | undefined }[];
  /** Drafts waiting on a human. */
  pendingReplies: number;
  /** ms epoch of the newest post that actually published, or null if none ever did. */
  lastPostedAt: number | null;
  now: number;
}

export interface Notice {
  code: NoticeCode;
  /** The failed post this notice is about, for the retry buttons. */
  postId?: string;
  /** ms epoch of that post's slot, for `{weekday}`. */
  scheduledAt?: number;
}

/** Nothing published in this long is a quiet profile. */
export const PROFILE_QUIET_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * `compose.ts` refuses to click Post when the intended image didn't attach, and
 * says so in exactly these words. Matching on "image" rather than the full
 * string keeps the notice working if that message is ever reworded.
 */
const isImageFailure = (error?: string): boolean => /image/i.test(error ?? '');

/**
 * At most ONE notice, in the doc's order: failures first because they're already
 * broken, the nudge last because it can wait a day.
 */
export const resolveNotice = (input: NoticeInput): Notice | null => {
  const newest = (list: readonly NoticeInput['failedPosts'][number][]) =>
    [...list].sort((a, b) => b.scheduledAt - a.scheduledAt)[0];

  const broken = newest(input.failedPosts.filter((p) => !isImageFailure(p.error)));
  if (broken) return { code: 'post-failed', postId: broken.id, scheduledAt: broken.scheduledAt };

  const imageProblem = newest(input.failedPosts.filter((p) => isImageFailure(p.error)));
  if (imageProblem) {
    return { code: 'image-failed', postId: imageProblem.id, scheduledAt: imageProblem.scheduledAt };
  }

  if (input.pendingReplies > 0) return { code: 'drafts-waiting' };

  // "Gone quiet" needs something to have gone quiet: a profile that has never
  // published isn't quiet, it's new, and telling a first-day user their profile
  // went quiet would be a lie in the one voice that must never lie.
  if (input.lastPostedAt !== null && input.now - input.lastPostedAt >= PROFILE_QUIET_MS) {
    return { code: 'profile-quiet' };
  }

  return null;
};

/**
 * Which single card shows.
 *
 * The engine being unable to work beats any notice — with one exception: a
 * `paused` engine is a state the user chose, and someone who paused it can still
 * have drafts to review, so a notice may show instead of it.
 */
export const pickCode = (
  engine: BlockReasonCode | null,
  notice: Notice | null,
): { engine: BlockReasonCode | null; notice: Notice | null } => {
  if (engine && engine !== 'paused') return { engine, notice: null };
  if (engine === 'paused' && notice) return { engine: null, notice };
  if (engine) return { engine, notice: null };
  return { engine: null, notice };
};

/* -- building a card -------------------------------------------------------- */

/**
 * Where each engine card's button goes. `caps-spent` and `server-unreachable`
 * are absent because they have no button — that is the point of them, not an
 * omission, so there is nothing here to accidentally start rendering.
 */
const ENGINE_ACTIONS: Partial<Record<BlockReasonCode, (label: string) => CardAction>> = {
  'not-configured': (label) => ({ label, kind: 'nav', to: 'who' }),
  'feed-off': (label) => ({ label, kind: 'nav', to: 'who' }),
  'outside-hours': (label) => ({ label, kind: 'nav', to: 'settings' }),
  'signed-out': (label) => ({ label, kind: 'open-x' }),
  'free-cap': (label) => ({ label, kind: 'nav', to: 'account' }),
  'sub-lapsed': (label) => ({ label, kind: 'billing' }),
  degraded: (label) => ({ label, kind: 'tell-us' }),
  paused: (label) => ({ label, kind: 'start' }),
  'nothing-matched': (label) => ({ label, kind: 'nav', to: 'who' }),
};

/**
 * Engine card. `vars` supplies `{n}` (topics, free actions, or posts skipped),
 * `{resumeTime}` and `{startHour}`.
 */
export const engineCard = (code: BlockReasonCode, vars: CopyVars = {}): Card => {
  const row = ENGINE_COPY[code];
  return {
    code,
    title: fill(row.title, vars) ?? row.title,
    body: row.body ? fill(row.body, vars) : null,
    actions: row.buttons.flatMap((label) => {
      const build = ENGINE_ACTIONS[code];
      return build ? [build(label)] : [];
    }),
    tone: row.tone,
  };
};

/** Notice card. `vars` supplies `{n}` and `{weekday}`. */
export const noticeCard = (notice: Notice, vars: CopyVars = {}): Card => {
  const row = NOTICE_COPY[notice.code];
  const postId = notice.postId ?? '';
  const actions: CardAction[] = row.buttons.map((label) => {
    switch (notice.code) {
      case 'drafts-waiting':
        return { label, kind: 'nav', to: 'review' } as CardAction;
      case 'profile-quiet':
        return { label, kind: 'write-two' } as CardAction;
      case 'post-failed':
        return { label, kind: 'retry-post', postId, dropImage: false } as CardAction;
      case 'image-failed':
        // "Post without image" comes first and is the one that drops it; "Retry"
        // tries the image again, because compose.ts refusing to post without it
        // was a choice, not a crash.
        return {
          label,
          kind: 'retry-post',
          postId,
          dropImage: label === 'Post without image',
        } as CardAction;
    }
  });
  return {
    code: notice.code,
    title: fill(row.title, vars) ?? row.title,
    body: row.body ? fill(row.body, vars) : null,
    actions,
    tone: row.tone,
  };
};
