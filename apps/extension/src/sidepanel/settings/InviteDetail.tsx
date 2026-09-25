import { useEffect, useState } from 'react';
import type { ReferralSummary } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Copy01Icon,
  GiftIcon,
  Linkedin01Icon,
  Mail01Icon,
  NewTwitterIcon,
  TelegramIcon,
  Tick02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { sendToBackground } from '../../lib/messages.js';
import { Group, Pad, Row } from './kit';

/**
 * Invite Friends — the share link and code, one-tap sharing, and what inviting
 * has earned. Every friend who signs up with the link gets bonus credits, and so
 * does the inviter, up to the cap (both numbers come from the server).
 */
type Resp = { ok: true; data: ReferralSummary } | { ok: false; error: { message: string } | string };

const message = (s: ReferralSummary) =>
  `I use Ghostly247 to grow on X while I sleep. Sign up with my link and you get ${s.creditsPerReferral} bonus credits 👻`;

/** Where each share button goes. All open a normal tab — no extra permissions. */
const SHARE_TARGETS: { label: string; icon: IconSvgElement; url: (s: ReferralSummary) => string }[] = [
  {
    label: 'WhatsApp',
    icon: WhatsappIcon,
    url: (s) => `https://wa.me/?text=${encodeURIComponent(`${message(s)} ${s.link}`)}`,
  },
  {
    label: 'Telegram',
    icon: TelegramIcon,
    url: (s) => `https://t.me/share/url?url=${encodeURIComponent(s.link)}&text=${encodeURIComponent(message(s))}`,
  },
  {
    label: 'LinkedIn',
    icon: Linkedin01Icon,
    url: (s) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(s.link)}`,
  },
  {
    label: 'X',
    icon: NewTwitterIcon,
    url: (s) => `https://x.com/intent/post?text=${encodeURIComponent(`${message(s)} ${s.link}`)}`,
  },
  {
    label: 'Email',
    icon: Mail01Icon,
    url: (s) =>
      `mailto:?subject=${encodeURIComponent('Try Ghostly247 — bonus credits inside')}&body=${encodeURIComponent(
        `${message(s)}\n\n${s.link}\n\nOr enter my invite code when you sign up: ${s.code}`,
      )}`,
  },
];

export const InviteDetail = () => {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    void sendToBackground<Resp>({ type: 'GET_REFERRAL', payload: {} })
      .then((resp) => {
        if (resp.ok) setSummary(resp.data);
        else setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your invite link'));
  }, []);

  const copy = async (what: 'link' | 'code', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 1800);
    } catch {
      setError('Couldn’t copy — select it and copy by hand.');
    }
  };

  if (error && !summary) {
    return <p className="px-4 text-sm text-muted-foreground">{error}</p>;
  }
  if (!summary) {
    return <p className="px-4 text-sm text-muted-foreground">Fetching your invite link…</p>;
  }

  const fraction = summary.cap > 0 ? Math.min(1, summary.count / summary.cap) : 1;
  const CopyButton = ({ what, text }: { what: 'link' | 'code'; text: string }) => (
    <Button size="sm" variant="secondary" className="shrink-0 rounded-full" onClick={() => void copy(what, text)}>
      <HugeiconsIcon icon={copied === what ? Tick02Icon : Copy01Icon} strokeWidth={2} data-icon="inline-start" className="size-4" />
      {copied === what ? 'Copied' : 'Copy'}
    </Button>
  );

  return (
    <>
      <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={GiftIcon} strokeWidth={1.8} className="size-6 text-primary" />
          <p className="font-display text-[17px] font-bold">
            Give {summary.creditsPerReferral}, get {summary.creditsPerReferral}
          </p>
        </div>
        <p className="text-sm leading-snug text-muted-foreground">
          Share your link. When a friend signs up with it, you both get {summary.creditsPerReferral} bonus credits — one
          credit is one extra action, used once your monthly allowance runs out. Credits never expire.
        </p>
      </section>

      <Group label="Your invite link" footer="Friends can also type the code in when they sign up.">
        <Pad className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] select-all">{summary.link}</span>
          <CopyButton what="link" text={summary.link} />
        </Pad>
        <Pad className="flex items-center gap-2">
          <span className="flex-1 text-[15px]">Invite code</span>
          <span className="font-mono text-[15px] font-semibold tracking-widest select-all">{summary.code}</span>
          <CopyButton what="code" text={summary.code} />
        </Pad>
      </Group>

      <Group label="Share">
        <Pad className="grid grid-cols-5 gap-1">
          {SHARE_TARGETS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => void chrome.tabs.create({ url: t.url(summary) })}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
                <HugeiconsIcon icon={t.icon} strokeWidth={1.8} className="size-5" />
              </span>
              {t.label}
            </button>
          ))}
        </Pad>
      </Group>

      <Group
        label="Your invites"
        footer={
          summary.remaining === 0
            ? `You've reached the ${summary.cap}-friend limit for rewards. Friends who join with your link still get their ${summary.creditsPerReferral} credits.`
            : `You earn ${summary.creditsPerReferral} credits for each of your first ${summary.cap} friends.`
        }
      >
        <Row
          icon={UserGroupIcon}
          label="Friends joined"
          value={<span className="font-semibold text-foreground tabular-nums">{summary.count}</span>}
        />
        <Row
          icon={GiftIcon}
          label="Credits earned"
          value={<span className="font-semibold text-foreground tabular-nums">{summary.creditsEarned}</span>}
        />
        <Row
          icon={Tick02Icon}
          label="Rewarded invites left"
          value={
            <span className="font-semibold text-foreground tabular-nums">
              {summary.remaining} / {summary.cap}
            </span>
          }
        />
        <Pad>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.max(fraction > 0 ? 3 : 0, fraction * 100)}%` }}
            />
          </div>
        </Pad>
      </Group>

      {error && <p className="px-4 text-xs text-muted-foreground">{error}</p>}
    </>
  );
};
