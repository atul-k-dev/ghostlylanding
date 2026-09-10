import { useEffect, useState } from 'react';
import { FREE_TIER } from '@casper/shared';
import {
  getPendingReplies,
  getScheduledPosts,
  getSettings,
  setSettings,
  setPanelIntent,
  retryScheduledPost,
  STORAGE_KEYS,
} from '../../lib/storage.js';
import { sendToBackground } from '../../lib/messages.js';
import { Card, Button } from '../../ui/index.js';
import type { EngineStatus } from '../useEngineStatus.js';
import type { PanelTarget } from '../navigation.js';
import type { BlockReasonCode } from '../../scheduler/block-reason.js';
import { SUPPORT_EMAIL } from './_shared.js';
import {
  engineCard,
  noticeCard,
  pickCode,
  resolveNotice,
  type Card as ConditionCardData,
  type CardAction,
  type Notice,
} from '../conditions.js';

/**
 * The one card that says what's going on — and the one button that changes it.
 *
 * ONE card, never a list: someone who opens the panel to six problems closes the
 * panel. Which one shows is decided in `conditions.ts` (`pickCode`), and every
 * string it renders comes from `docs/ui-copy.md` via that same module. This file
 * owns only two things the pure module can't: reading the four notice states out
 * of storage, and doing what a button says.
 */

/** "9am" / "10pm" — how the copy writes an hour. */
const formatHour = (hour: number): string => {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
};

const weekdayOf = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long' });

/** The notice states' raw inputs, kept live off storage. */
const useNotice = (): { notice: Notice | null; pendingReplies: number } => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingReplies, setPending] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [replies, posts] = await Promise.all([getPendingReplies(), getScheduledPosts()]);
      setPending(replies.length);
      const published = posts
        .filter((p) => p.status === 'posted' && typeof p.postedAt === 'number')
        .map((p) => p.postedAt as number);
      setNotice(
        resolveNotice({
          failedPosts: posts
            .filter((p) => p.status === 'failed')
            .map((p) => ({ id: p.id, scheduledAt: p.scheduledAt, error: p.error })),
          pendingReplies: replies.length,
          lastPostedAt: published.length > 0 ? Math.max(...published) : null,
          now: Date.now(),
        }),
      );
    };
    void load();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return;
      if (STORAGE_KEYS.pendingReplies in changes || STORAGE_KEYS.scheduledPosts in changes) {
        void load();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return { notice, pendingReplies };
};

const runAction = async (action: CardAction, nav: (t: PanelTarget) => void): Promise<void> => {
  switch (action.kind) {
    case 'nav':
      nav(action.to);
      return;
    case 'start': {
      const s = await getSettings();
      await setSettings({ ...s, isPaused: false });
      return;
    }
    case 'open-x':
      await chrome.tabs.create({ url: 'https://x.com/home', active: true });
      return;
    case 'billing':
      await sendToBackground({ type: 'OPEN_BILLING_PORTAL', payload: {} });
      return;
    case 'tell-us':
      // A selector break is ours to fix, and the user's report is the fastest
      // signal we get. Their own mail client, so nothing is sent behind them.
      await chrome.tabs.create({
        url: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
          "Ghostly247 can't read the X feed",
        )}`,
        active: true,
      });
      return;
    case 'write-two':
      await setPanelIntent('write-two');
      nav('posts');
      return;
    case 'retry-post':
      await retryScheduledPost(action.postId, { dropImage: action.dropImage });
      return;
  }
};

export const ConditionCard = ({
  status,
  onNavigate,
}: {
  status: EngineStatus;
  onNavigate?: (t: PanelTarget) => void;
}) => {
  const { notice, pendingReplies } = useNotice();
  const settings = status.settings;

  // `isPaused` beats the persisted reason: the scheduler only rewrites
  // blockReason on its next tick, and a user who just hit Pause should not read
  // a stale sentence about their caps for the next minute.
  let engine: BlockReasonCode | null = settings?.isPaused
    ? 'paused'
    : (status.blockReason?.code ?? null);

  // "Skipped {n} posts" needs a real n. The scheduler only reports
  // `nothing-matched` once a scan has actually skipped something (and puts the
  // count in `detail`), but if that number is ever missing, say nothing rather
  // than invent one.
  const skipped = Number(status.blockReason?.detail);
  const haveSkipped = engine === 'nothing-matched' && Number.isFinite(skipped) && skipped > 0;
  if (engine === 'nothing-matched' && !haveSkipped) engine = null;

  const chosen = pickCode(engine, notice);

  let card: ConditionCardData | null = null;
  if (chosen.engine) {
    const startHour = settings ? formatHour(settings.activeHours.startHour) : null;
    card = engineCard(chosen.engine, {
      n:
        chosen.engine === 'feed-off'
          ? (settings?.searchQueries.length ?? 0) + (settings?.targetCreators.length ?? 0)
          : chosen.engine === 'free-cap'
            ? FREE_TIER.monthlyActions
            : chosen.engine === 'nothing-matched'
              ? skipped
              : null,
      // Caps and active hours reset together, so one time covers both.
      resumeTime: startHour,
      startHour,
    });
  } else if (chosen.notice) {
    card = noticeCard(chosen.notice, {
      n: chosen.notice.code === 'drafts-waiting' ? pendingReplies : null,
      ...(chosen.notice.scheduledAt !== undefined
        ? { weekday: weekdayOf(chosen.notice.scheduledAt) }
        : {}),
    });
  }

  const nav = onNavigate ?? (() => undefined);

  // Working, nothing to report, nothing waiting.
  if (!card) {
    return (
      <Card tone={status.state === 'working' ? 'working' : 'default'} title={status.label}>
        <p className="text-xs leading-relaxed text-casper-muted">
          Nothing needs doing. I&rsquo;ll keep going.
        </p>
      </Card>
    );
  }

  return (
    <Card
      tone={card.tone === 'attention' ? 'attention' : 'default'}
      title={card.title}
      action={
        card.actions.length === 1 && card.actions[0] ? (
          <Button size="sm" variant="primary" onClick={() => void runAction(card.actions[0]!, nav)}>
            {card.actions[0].label}
          </Button>
        ) : undefined
      }
    >
      {card.body && <p className="text-xs leading-relaxed text-casper-muted">{card.body}</p>}
      {/* The one two-button card in the set: dropping the image and retrying it
          are different decisions, so neither hides behind the other. */}
      {card.actions.length > 1 && (
        <div className="mt-2 flex gap-2">
          {card.actions.map((a, i) => (
            <Button
              key={a.label}
              size="sm"
              variant={i === 0 ? 'primary' : 'secondary'}
              onClick={() => void runAction(a, nav)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
};
