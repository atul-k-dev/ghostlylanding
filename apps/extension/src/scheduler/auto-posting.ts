import type { ExtensionSettings } from '@casper/shared';
import {
  getSettings,
  setSettings,
  getScheduledPosts,
  setScheduledPosts,
  getPostOutcomes,
  isPendingPost,
  MAX_SCHEDULED_POSTS,
  type ScheduledPost,
} from '../lib/storage.js';
import { bestTimes, nextSlots } from '../lib/best-times.js';
import { presetOf } from '../lib/presets.js';
import { isTrusted } from '../lib/trust.js';
import { appendDiagnostic } from '../lib/storage.js';

/**
 * The auto-draft loop (updateplan 3.2).
 *
 * The engagement half of this product has been autonomous since it shipped; the
 * publishing half was entirely manual. This closes that gap — but it is the one
 * feature that writes under the user's name, so every gate here is a refusal
 * rather than a target:
 *
 *  - **Off unless asked.** `settings.autoPost.enabled` defaults false and
 *    nothing but a user turns it on (§8's standing decision).
 *  - **Nothing publishes unread until trust is granted.** Drafts land with
 *    status `draft`, which `maybePublishDuePost` does not select. Only after
 *    the graduation offer (3.3) is accepted do they land as `scheduled`.
 *  - **It tops up, it does not push.** It runs when the profile has actually
 *    gone quiet and the queue is short — a user posting by hand every day never
 *    sees it do anything.
 *
 * The generation itself is the existing `/api/posts/ideas` path, which already
 * uses the trained voice, the user's topics and their best-performing posts.
 * There is no second generator here, deliberately: a parallel one would drift
 * from the one the user has been reading and correcting.
 */

/** How often the loop may even look. The alarm ticks every 30 seconds. */
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Two auto-drafted posts are never closer together than this. */
const MIN_GAP_MS = 6 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

/** Ask the server for ideas. Injected so the smoke suite never needs a network. */
export type IdeaSource = (count: number) => Promise<string[]>;

export interface AutoDraftDecision {
  /** Why we are not drafting, or null when we are. */
  skip:
    | null
    | 'disabled'
    | 'ran-recently'
    | 'queue-full'
    | 'enough-queued'
    | 'posted-recently'
    | 'no-topics';
  /** How many drafts to write. Zero whenever `skip` is set. */
  want: number;
}

export interface AutoDraftInput {
  settings: ExtensionSettings;
  posts: readonly ScheduledPost[];
  now: number;
}

/**
 * Should the loop run, and for how many posts? Pure, so every branch is
 * testable — the half of this feature that decides to publish is not a place
 * for logic that can only be exercised against a live browser.
 */
export const decideAutoDraft = ({ settings, posts, now }: AutoDraftInput): AutoDraftDecision => {
  const auto = settings.autoPost;
  const none: Omit<AutoDraftDecision, 'skip'> = { want: 0 };

  if (!auto.enabled) return { ...none, skip: 'disabled' };
  // Topics are what the ideas endpoint writes from. Without them it would be
  // guessing at what this person talks about, in public, under their name.
  if (settings.contentTopics.length === 0) return { ...none, skip: 'no-topics' };

  const lastRun = auto.lastRunAt ? Date.parse(auto.lastRunAt) : NaN;
  if (Number.isFinite(lastRun) && now - lastRun < RUN_INTERVAL_MS) {
    return { ...none, skip: 'ran-recently' };
  }

  const pending = posts.filter(isPendingPost);
  if (pending.length >= MAX_SCHEDULED_POSTS) return { ...none, skip: 'queue-full' };
  if (pending.length >= auto.maxQueued) return { ...none, skip: 'enough-queued' };

  // "Published nothing in > N hours" counts what actually went out AND what is
  // already booked to go out, so the loop can't stack drafts on top of a post
  // that publishes in an hour.
  const lastActivity = Math.max(
    0,
    ...posts
      .filter((p) => p.status === 'posted' && typeof p.postedAt === 'number')
      .map((p) => p.postedAt as number),
    ...pending.map((p) => p.scheduledAt),
  );
  if (lastActivity > 0 && now - lastActivity < auto.quietHours * HOUR_MS) {
    return { ...none, skip: 'posted-recently' };
  }

  const perDay = presetOf(settings).postsPerDay;
  const room = Math.min(auto.maxQueued - pending.length, MAX_SCHEDULED_POSTS - pending.length);
  return { skip: null, want: Math.max(0, Math.min(perDay, room)) };
};

export interface AutoDraftResult {
  drafted: number;
  skip: AutoDraftDecision['skip'];
  /** True when the drafts went straight onto the schedule (trust granted). */
  autoPublish: boolean;
}

/**
 * Run one pass. Never throws — it is called from the alarm tick, and a failed
 * idea request must not take the engine's turn down with it.
 */
export const maybeAutoDraft = async (
  generateIdeas: IdeaSource,
  now: number = Date.now(),
): Promise<AutoDraftResult> => {
  const settings = await getSettings();
  const posts = await getScheduledPosts();
  const decision = decideAutoDraft({ settings, posts, now });
  if (decision.skip !== null || decision.want === 0) {
    return { drafted: 0, skip: decision.skip, autoPublish: false };
  }

  // Stamp the run BEFORE the network call. A request that fails must still cost
  // the interval, or a broken API turns into an idea request every 30 seconds.
  await setSettings({
    ...settings,
    autoPost: { ...settings.autoPost, lastRunAt: new Date(now).toISOString() },
  });

  let ideas: string[] = [];
  try {
    ideas = await generateIdeas(decision.want);
  } catch (err) {
    await appendDiagnostic({
      kind: 'network_error',
      context: 'auto-post',
      detail: `Could not draft posts: ${err instanceof Error ? err.message : 'unknown error'}`,
    });
    return { drafted: 0, skip: null, autoPublish: false };
  }
  if (ideas.length === 0) return { drafted: 0, skip: null, autoPublish: false };

  const best = bestTimes(await getPostOutcomes(), { activeHours: settings.activeHours });
  const taken = posts.filter(isPendingPost).map((p) => p.scheduledAt);
  const slots = nextSlots(best, {
    from: now,
    count: ideas.length,
    taken,
    minGapMs: MIN_GAP_MS,
    activeHours: settings.activeHours,
  });
  if (slots.length === 0) return { drafted: 0, skip: null, autoPublish: false };

  // Trust decides the status, and nothing else does. A draft cannot publish;
  // `maybePublishDuePost` selects on 'scheduled'.
  const autoPublish = isTrusted(settings.trust);
  const fresh: ScheduledPost[] = slots.map((scheduledAt, i) => ({
    id: crypto.randomUUID(),
    text: (ideas[i] ?? '').trim(),
    link: '',
    imageDataUrl: null,
    scheduledAt,
    status: autoPublish ? ('scheduled' as const) : ('draft' as const),
    createdAt: now,
    origin: 'auto' as const,
    generated: (ideas[i] ?? '').trim(),
  }));

  await setScheduledPosts([...posts, ...fresh]);
  // No diagnostic on success: that buffer is a hundred slots of things that
  // went wrong, and filling it with routine successes would evict the failures
  // it exists to keep. The week strip is where a drafted post shows up.
  console.log(
    `[casper] auto-post: ${fresh.length} ${autoPublish ? 'scheduled' : 'drafted for review'}`,
  );
  return { drafted: fresh.length, skip: null, autoPublish };
};
