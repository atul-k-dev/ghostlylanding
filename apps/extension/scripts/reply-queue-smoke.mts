/* eslint-disable no-console */
/**
 * Reply approval queue smoke — the storage invariants, against an in-memory
 * chrome.storage.local stub. Run with:
 *   pnpm --filter @casper/extension reply-queue-smoke
 */
import { REPLY_QUEUE_MAX, type PendingReply } from '@casper/shared';

// --- chrome.storage.local stub (set up BEFORE importing storage.js) ---------
const store: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: store[key] }),
      set: async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      },
      remove: async (key: string) => {
        delete store[key];
      },
    },
  },
};

const {
  getPendingReplies,
  setPendingReplies,
  queuePendingReply,
  takePendingReply,
  pendingReplySpace,
  getSettings,
} = await import('../src/lib/storage.js');

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const draft = (n: number): PendingReply => ({
  id: `draft-${n}`,
  platform: 'twitter',
  postId: `post-${n}`,
  postUrl: `https://x.com/someone/status/${n}`,
  postText: `a post about thing ${n}`,
  authorHandle: 'someone',
  draftText: `a reply to thing ${n}`,
  createdAt: Date.now() + n,
});

// --- empty state ------------------------------------------------------------
assert((await getPendingReplies()).length === 0, 'queue starts empty');
assert((await pendingReplySpace()) === REPLY_QUEUE_MAX, 'full space when empty');

// --- basic add --------------------------------------------------------------
assert((await queuePendingReply(draft(1))) === true, 'first draft accepted');
assert((await getPendingReplies()).length === 1, 'queue holds one');
assert((await pendingReplySpace()) === REPLY_QUEUE_MAX - 1, 'space drops by one');

// --- duplicate post is a no-op, not a second card ---------------------------
const dupe = { ...draft(1), id: 'draft-1-again' };
assert((await queuePendingReply(dupe)) === true, 'duplicate post reports success');
assert((await getPendingReplies()).length === 1, 'duplicate post does NOT add a second entry');

// --- fill to the ceiling ----------------------------------------------------
for (let i = 2; i <= REPLY_QUEUE_MAX; i++) await queuePendingReply(draft(i));
assert((await getPendingReplies()).length === REPLY_QUEUE_MAX, `queue fills to ${REPLY_QUEUE_MAX}`);
assert((await pendingReplySpace()) === 0, 'no space left at the ceiling');

// --- THE invariant: refuse, never evict -------------------------------------
const before = await getPendingReplies();
const accepted = await queuePendingReply(draft(999));
assert(accepted === false, 'a full queue REFUSES the new draft');
const after = await getPendingReplies();
assert(after.length === REPLY_QUEUE_MAX, 'full queue stays at the ceiling');
assert(after[0]?.id === before[0]?.id, 'oldest draft is NOT evicted');
assert(!after.some((r) => r.id === 'draft-999'), 'refused draft never enters the queue');

// --- taking one back --------------------------------------------------------
const taken = await takePendingReply('draft-5');
assert(taken?.postId === 'post-5', 'takePendingReply returns the draft');
assert((await getPendingReplies()).length === REPLY_QUEUE_MAX - 1, 'taking removes exactly one');
assert((await pendingReplySpace()) === 1, 'space frees up after taking one');
assert((await takePendingReply('draft-5')) === null, 'taking the same draft twice yields null');
assert((await takePendingReply('never-existed')) === null, 'unknown id yields null');

// After freeing a slot, drafting can resume.
assert((await queuePendingReply(draft(999))) === true, 'a freed slot accepts a new draft');

// --- settings default -------------------------------------------------------
await setPendingReplies([]);
const fresh = await getSettings();
assert(fresh.replyApproval === true, 'fresh install defaults to approval ON');

// An existing user's stored settings (written before this feature) must NOT be
// flipped into approval mode by the upgrade.
store['casper.settings'] = { ...fresh, replyApproval: undefined };
delete (store['casper.settings'] as Record<string, unknown>).replyApproval;
const upgraded = await getSettings();
assert(upgraded.replyApproval === false, 'existing install keeps auto-posting after upgrade');

store['casper.settings'] = { ...fresh, replyApproval: true };
assert((await getSettings()).replyApproval === true, 'an explicit opt-in is honoured');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 reply-queue-smoke OK');
