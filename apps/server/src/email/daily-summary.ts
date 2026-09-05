/**
 * End-of-day activity digest. Renders a branded HTML email summarising every
 * action Ghostly247 took for the user that day — with the AI-written replies &
 * quotes shown in full so the user can review that they sound right.
 *
 * Also owns the signed unsubscribe token (HMAC over the user id with the JWT
 * secret) so a one-click link in the footer can turn the digest off, verified
 * by the /r/email/unsubscribe page.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export interface DigestReply {
  text: string;
  postUrl: string;
  tone: string;
}

export interface DigestFollow {
  handle: string;
  url: string;
}

/** Optional growth line — omitted entirely until there are two readings. */
export interface DigestGrowth {
  followers: number;
  /** Follower change over the measured span. */
  change: number;
  /** Days the change actually spans (readings can be gappy). */
  days: number;
}

export interface DailySummaryData {
  firstName: string;
  dateLabel: string;
  counts: {
    like: number;
    comment: number;
    follow: number;
    bookmark: number;
    repost: number;
    quote: number;
  };
  totalActions: number;
  replies: DigestReply[];
  moreReplies: number;
  follows: DigestFollow[];
  moreFollows: number;
  /** Follower movement, when we have enough readings to state one honestly. */
  growth?: DigestGrowth | null;
  unsubscribeUrl: string;
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// -- Unsubscribe token -------------------------------------------------------
const unsubToken = (userId: string): string =>
  crypto
    .createHmac('sha256', config.jwtSecret ?? '')
    .update(`digest:${userId}`)
    .digest('hex');

export const buildUnsubscribeUrl = (userId: string): string =>
  `${config.serverBaseUrl}/r/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;

export const verifyUnsubToken = (userId: string, token: string): boolean => {
  const expected = unsubToken(userId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
};

// -- Template (dark brand theme — matches the popup + landing) ----------------
const PAGE = '#0e0e0e'; // page canvas
const CARD = '#141414'; // main card
const SURFACE = '#1b1b1b'; // stat tiles
const INSET = '#161616'; // reply cards
const BORDER = '#2e2e2e'; // hairlines
const FG = '#f4f4f5'; // primary text
const MUTED = '#a1a1aa'; // secondary text
const CORAL = '#f44d60'; // brand accent
const CORAL_BRIGHT = '#ff6467';
const CORAL_TINT = 'rgba(244,77,96,0.14)';
const LOGO_URL = `${config.emailAssetBaseUrl}/ghostly247logo.png`;

const statTile = (value: number, label: string): string => `
  <td width="33.33%" style="padding:5px" valign="top">
    <div style="background:${SURFACE};border:1px solid ${BORDER};border-radius:14px;padding:14px 8px;text-align:center">
      <div style="font-size:24px;font-weight:700;color:${FG};line-height:1">${value}</div>
      <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin-top:6px">${label}</div>
    </div>
  </td>`;

const replyCard = (r: DigestReply): string => `
  <div style="background:${INSET};border:1px solid ${BORDER};border-radius:14px;padding:14px 16px;margin:0 0 10px">
    <div style="font-size:14px;color:${FG};line-height:1.55">“${esc(r.text)}”</div>
    <div style="margin-top:10px;font-size:12px">
      <span style="background:${CORAL_TINT};color:${CORAL_BRIGHT};border-radius:999px;padding:3px 9px;font-weight:600;text-transform:capitalize">${esc(r.tone)}</span>
      <a href="${esc(r.postUrl)}" style="color:${CORAL_BRIGHT};text-decoration:none;margin-left:8px">View post &rarr;</a>
    </div>
  </div>`;

const followChip = (f: DigestFollow): string => `
  <a href="${esc(f.url)}" style="display:inline-block;background:${SURFACE};border:1px solid ${BORDER};border-radius:999px;padding:6px 12px;margin:0 6px 6px 0;font-size:13px;color:${FG};text-decoration:none">@${esc(f.handle)}</a>`;

export const renderDailySummary = (
  d: DailySummaryData,
): { subject: string; html: string; text: string } => {
  const s = d.totalActions === 1 ? '' : 's';
  const subject = `👻 Your Ghostly247 recap — ${d.totalActions} action${s} on ${d.dateLabel}`;

  const repliesSection =
    d.replies.length > 0
      ? `
      <h2 style="font-size:15px;color:${FG};margin:28px 0 4px">Replies &amp; quotes I posted</h2>
      <p style="font-size:12px;color:${MUTED};margin:0 0 14px">Give these a read — do they still sound like you?</p>
      ${d.replies.map(replyCard).join('')}
      ${d.moreReplies > 0 ? `<p style="font-size:12px;color:${MUTED};margin:2px 0 0">+ ${d.moreReplies} more not shown here.</p>` : ''}`
      : `
      <h2 style="font-size:15px;color:${FG};margin:28px 0 4px">Replies &amp; quotes</h2>
      <p style="font-size:13px;color:${MUTED};margin:0">No AI replies or quotes went out today — just the lighter-touch actions above.</p>`;

  const followsSection =
    d.follows.length > 0
      ? `
      <h2 style="font-size:15px;color:${FG};margin:28px 0 12px">New follows</h2>
      <div>${d.follows.map(followChip).join('')}</div>
      ${d.moreFollows > 0 ? `<p style="font-size:12px;color:${MUTED};margin:8px 0 0">+ ${d.moreFollows} more.</p>` : ''}`
      : '';

  // The one line that answers "is this working?" — shown only when a real
  // comparison exists, so we never invent a trend from a single reading.
  const growthSection = d.growth
    ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px">
            <tr><td style="background:${CORAL_TINT};border:1px solid ${BORDER};border-radius:14px;padding:14px 16px">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED}">Followers</div>
              <div style="font-size:24px;font-weight:600;color:${FG};margin-top:4px">${d.growth.followers.toLocaleString()}</div>
              <div style="font-size:13px;color:${d.growth.change >= 0 ? CORAL_BRIGHT : MUTED};margin-top:2px">
                ${d.growth.change >= 0 ? '+' : ''}${d.growth.change.toLocaleString()} over the last ${d.growth.days} day${d.growth.days === 1 ? '' : 's'}
              </div>
            </td></tr>
          </table>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${PAGE}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:24px;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
        <tr><td style="padding:34px 28px 0">
          <div style="text-align:center">
            <img src="${LOGO_URL}" width="56" height="56" alt="Ghostly247" style="display:inline-block;width:56px;height:56px;object-fit:contain" />
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};margin-top:10px">Ghostly247</div>
            <h1 style="font-size:22px;color:${FG};margin:16px 0 4px">Your daily recap</h1>
            <div style="font-size:13px;color:${MUTED}">${d.dateLabel}</div>
          </div>
          <p style="font-size:14px;color:${MUTED};line-height:1.6;margin:22px 0 18px">
            Hi ${esc(d.firstName)} — here's everything I did for you yesterday. Skim it and make sure it still feels like you. 👀
          </p>
          ${growthSection}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>${statTile(d.counts.like, 'Likes')}${statTile(d.counts.comment, 'Replies')}${statTile(d.counts.follow, 'Follows')}</tr>
            <tr>${statTile(d.counts.bookmark, 'Bookmarks')}${statTile(d.counts.repost, 'Reposts')}${statTile(d.counts.quote, 'Quotes')}</tr>
          </table>
          ${repliesSection}
          ${followsSection}
        </td></tr>
        <tr><td style="padding:26px 28px 30px">
          <div style="border-top:1px solid ${BORDER};padding-top:18px">
            <p style="font-size:12px;color:${MUTED};line-height:1.6;margin:0">
              Reviewing keeps your account safe and on-brand. If something feels off, tweak your tone, keywords, or daily caps in the extension — or hit the Active pill to pause anytime.
            </p>
            <p style="font-size:11px;color:${MUTED};margin:14px 0 0">
              <a href="mailto:support@ghostly247.com" style="color:${CORAL};text-decoration:none">Contact support</a>
              &nbsp;·&nbsp;
              <a href="${esc(d.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Unsubscribe from daily recaps</a>
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const lines: string[] = [
    `Your Ghostly247 daily recap — ${d.dateLabel}`,
    ``,
    `Hi ${d.firstName}, here's everything I did for you yesterday:`,
    ``,
    ...(d.growth
      ? [
          `Followers: ${d.growth.followers.toLocaleString()} (${d.growth.change >= 0 ? '+' : ''}${d.growth.change.toLocaleString()} over the last ${d.growth.days} day${d.growth.days === 1 ? '' : 's'})`,
          ``,
        ]
      : []),
    `Likes: ${d.counts.like}`,
    `Replies: ${d.counts.comment}`,
    `Follows: ${d.counts.follow}`,
    `Bookmarks: ${d.counts.bookmark}`,
    `Reposts: ${d.counts.repost}`,
    `Quotes: ${d.counts.quote}`,
  ];
  if (d.replies.length > 0) {
    lines.push('', 'Replies & quotes I posted (do these sound like you?):');
    for (const r of d.replies) lines.push('', `"${r.text}"`, r.postUrl);
    if (d.moreReplies > 0) lines.push('', `+ ${d.moreReplies} more not shown here.`);
  }
  if (d.follows.length > 0) {
    lines.push('', 'New follows:', d.follows.map((f) => `@${f.handle}`).join(', '));
    if (d.moreFollows > 0) lines.push(`+ ${d.moreFollows} more.`);
  }
  lines.push('', `Unsubscribe from daily recaps: ${d.unsubscribeUrl}`);

  return { subject, html, text: lines.join('\n') };
};
