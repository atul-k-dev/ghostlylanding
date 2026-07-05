/**
 * Scheduled-post publisher (service-worker side).
 *
 * The alarm tick calls maybePublishDuePost() BEFORE the autopilot gate, so a
 * scheduled post fires at its time even while the engine is paused (the user
 * scheduled it explicitly). At most one post publishes per tick, guarded so it
 * never runs alongside an autopilot task or another publish.
 */
import { getScheduledPosts, setScheduledPosts, appendDiagnostic } from '../lib/storage.js';
import type { ScheduledPost } from '../lib/storage.js';
import { driveTab } from '../platforms/common/tab-driver.js';

const COMPOSE_URL = 'https://x.com/compose/post';

let publishing = false;

/** True while a scheduled post is mid-publish — the tick uses this to avoid
 *  also running the autopilot (two tabs at once). */
export const isPublishing = (): boolean => publishing;

/** True when at least one post is scheduled for now-or-earlier. */
export const hasDueScheduledPost = async (): Promise<boolean> => {
  const now = Date.now();
  return (await getScheduledPosts()).some((p) => p.status === 'scheduled' && p.scheduledAt <= now);
};

const patch = async (id: string, changes: Partial<ScheduledPost>): Promise<void> => {
  const posts = await getScheduledPosts();
  await setScheduledPosts(posts.map((p) => (p.id === id ? { ...p, ...changes } : p)));
};

const markFailed = async (id: string, error: string): Promise<void> => {
  await patch(id, { status: 'failed', error });
  await appendDiagnostic({
    kind: 'network_error',
    context: 'twitter:scheduled-post',
    detail: `Scheduled post failed: ${error}`,
  });
};

/**
 * Any post left 'publishing' when the service worker restarted is ambiguous —
 * it may or may not have posted. We mark it failed (never silently retry) so we
 * can't double-post to the user's public timeline; they can reschedule it.
 */
export const reviveScheduledPosts = async (): Promise<void> => {
  const posts = await getScheduledPosts();
  if (!posts.some((p) => p.status === 'publishing')) return;
  await setScheduledPosts(
    posts.map((p) =>
      p.status === 'publishing'
        ? { ...p, status: 'failed', error: 'interrupted (browser or extension restarted)' }
        : p,
    ),
  );
};

/**
 * Publish the oldest due post, if any. Returns true if it attempted one (so the
 * tick can yield the rest of its turn). Never throws.
 */
export const maybePublishDuePost = async (): Promise<boolean> => {
  if (publishing) return false;
  const now = Date.now();
  const posts = await getScheduledPosts();
  const due = posts
    .filter((p) => p.status === 'scheduled' && p.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
  if (!due) return false;

  publishing = true;
  try {
    // Persist 'publishing' first so a crash can't leave it eligible to re-fire.
    await patch(due.id, { status: 'publishing' });

    let resp;
    try {
      resp = await driveTab(
        COMPOSE_URL,
        {
          type: 'PUBLISH_POST',
          payload: {
            text: due.text,
            ...(due.link ? { link: due.link } : {}),
            imageDataUrl: due.imageDataUrl,
          },
        },
        { settleMs: 3_500 },
      );
    } catch (err) {
      await markFailed(due.id, err instanceof Error ? err.message : 'tab driver failed');
      return true;
    }

    if (resp.type === 'PUBLISH_RESULT' && resp.payload.posted) {
      await patch(due.id, { status: 'posted', postedAt: Date.now() });
      console.log('[casper] scheduled post published', due.id);
    } else {
      const msg =
        resp.type === 'PUBLISH_RESULT'
          ? (resp.payload.error ?? 'post did not go through')
          : resp.type === 'ERROR'
            ? resp.payload.message
            : 'unexpected compose response';
      await markFailed(due.id, msg);
    }
    return true;
  } finally {
    publishing = false;
  }
};
