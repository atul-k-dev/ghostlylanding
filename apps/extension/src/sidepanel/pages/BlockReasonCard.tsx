import type { ExtensionSettings } from '@casper/shared';
import { getSettings, setSettings } from '../../lib/storage.js';
import { sendToBackground } from '../../lib/messages.js';
import type { BlockReasonCode } from '../../scheduler/block-reason.js';
import { Card, Button } from '../../ui/index.js';
import type { EngineStatus } from '../useEngineStatus.js';
import type { PanelTarget } from '../navigation.js';

/**
 * The one card that says why nothing is happening — and the one button that
 * changes it.
 *
 * Driven entirely by `casper.blockReason` (0.6). ONE card at a time, never a
 * list: a user who opens the panel to six problems closes the panel.
 *
 * Copy note (updateplan 1.7): the plan says this copy is fixed by the design
 * brief and must not be improvised. That brief was not in the repo, so what is
 * here follows §3's copy rules instead — present tense, name the real thing,
 * never a blocked state without its button, no apologies — and should be
 * replaced verbatim if the brief says otherwise.
 */
interface Condition {
  /** What is true, in the user's terms. Not a status code. */
  title: string;
  /** What it means and what happens next. One or two sentences. */
  body: (s: ExtensionSettings | null, detail?: string) => string;
  /** The single button. Null only where there is genuinely nothing to press. */
  action: { label: string; run: (nav: (t: PanelTarget) => void) => void | Promise<void> } | null;
  tone: 'attention' | 'default';
}

const openX = () => {
  void chrome.tabs.create({ url: 'https://x.com/home', active: true });
};

export const CONDITIONS: Record<BlockReasonCode, Condition> = {
  paused: {
    title: 'You’ve got me paused',
    body: () => 'Nothing is running. Start me again whenever you want.',
    action: {
      label: 'Start',
      run: async () => {
        const s = await getSettings();
        await setSettings({ ...s, isPaused: false });
      },
    },
    tone: 'default',
  },
  'signed-out': {
    title: 'You’re signed out of X',
    body: () => 'I work in your own browser session, so I can’t do anything until you’re signed in.',
    action: { label: 'Open x.com', run: openX },
    tone: 'attention',
  },
  'sub-lapsed': {
    title: 'Your subscription lapsed',
    body: () => 'Your settings and history are all still here. Sorting out billing picks up where you left off.',
    action: {
      label: 'Fix billing',
      run: () => void sendToBackground({ type: 'OPEN_BILLING_PORTAL', payload: {} }),
    },
    tone: 'attention',
  },
  'free-cap': {
    title: 'That’s the free allowance for this month',
    body: () => 'It resets at the start of next month. Pro removes the limit entirely.',
    action: { label: 'See plans', run: (nav) => nav('account') },
    tone: 'attention',
  },
  'server-unreachable': {
    title: 'I can’t reach my server',
    body: () => 'Likes and follows still work; writing replies needs the connection back. I keep retrying.',
    action: { label: 'Try again', run: () => void sendToBackground({ type: 'PING', payload: {} }) },
    tone: 'attention',
  },
  degraded: {
    title: 'I can’t read your timeline',
    body: () =>
      'X may have changed its layout, or you may be signed out. I’ve stopped rather than clicking blindly.',
    action: { label: 'Open x.com', run: openX },
    tone: 'attention',
  },
  'caps-spent': {
    title: 'That’s today’s safe limit',
    body: (s) =>
      s?.safetyPreset === 'growth'
        ? 'I’ll pick up again after midnight your time. This is already the fastest I go.'
        : 'I’ll pick up again after midnight your time. You can ask me to work harder if you want.',
    action: { label: 'Change my pace', run: (nav) => nav('settings') },
    tone: 'default',
  },
  'outside-hours': {
    title: 'It’s outside your hours',
    body: (_s, detail) =>
      detail
        ? `I work ${detail}, so I’m sitting this one out.`
        : 'I’m sitting this one out until your active hours come round again.',
    action: { label: 'Change my hours', run: (nav) => nav('settings') },
    tone: 'default',
  },
  'not-configured': {
    title: 'I don’t know where to look yet',
    body: () => 'Give me a topic or a couple of accounts to watch and I’ll get going.',
    action: { label: 'Set me up', run: (nav) => nav('who') },
    tone: 'attention',
  },
  'feed-off': {
    title: 'The feed is switched off',
    body: () =>
      'You’ve told me what to watch, but not what to do about it — so nothing happens. Turning the feed on with one action fixes it.',
    action: { label: 'Turn it on', run: (nav) => nav('who') },
    tone: 'attention',
  },
  'nothing-matched': {
    title: 'Nothing worth replying to yet',
    body: (_s, detail) =>
      detail
        ? `I’ve been reading (${detail}) and nothing matched what you care about. That’s a quiet feed, not a fault.`
        : 'I’ve been reading and nothing matched what you care about. That’s a quiet feed, not a fault.',
    action: { label: 'Add a topic', run: (nav) => nav('who') },
    tone: 'default',
  },
};

export const BlockReasonCard = ({
  status,
  onNavigate,
}: {
  status: EngineStatus;
  onNavigate?: (t: PanelTarget) => void;
}) => {
  const code = status.settings?.isPaused ? 'paused' : status.blockReason?.code;

  // Working and nothing to report. §3: "Nothing needs doing. I'll keep going."
  if (!code) {
    return (
      <Card tone={status.state === 'working' ? 'working' : 'default'} title={status.label}>
        <p className="text-xs leading-relaxed text-casper-muted">
          Nothing needs doing. I’ll keep going.
        </p>
      </Card>
    );
  }

  const condition = CONDITIONS[code];
  const nav = onNavigate ?? (() => undefined);

  return (
    <Card
      tone={condition.tone}
      title={condition.title}
      action={
        condition.action ? (
          <Button size="sm" variant="primary" onClick={() => void condition.action?.run(nav)}>
            {condition.action.label}
          </Button>
        ) : undefined
      }
    >
      <p className="text-xs leading-relaxed text-casper-muted">
        {condition.body(status.settings, status.blockReason?.detail)}
      </p>
    </Card>
  );
};
