/**
 * Weekly recap email (updateplan 4.4).
 *
 * The daily email answers "what happened yesterday"; this answers "was this
 * week worth it" — followers gained against LAST week, not just a running
 * total, and the single post that won the week. Same dark brand template as
 * `daily-summary.ts` (same tokens, same shapes) because it's the same product
 * writing to the same person, not a second design.
 *
 * **What this deliberately does NOT claim**, and why: the plan's content list
 * also asks for "which target worked best," "which target was dropped and
 * why," and "a timing change made." None of the three has a real answer
 * anywhere in this codebase to report — there is no link from an engagement
 * action back to which target creator or search feed produced it, no signal
 * ever reaches the server when a user removes a target (target lists live only
 * in `chrome.storage.local`), and no feature anywhere adjusts posting times
 * automatically. Inventing plausible-sounding answers to any of the three
 * would be exactly the "no fake data" line this product has held everywhere
 * else. What ships instead is everything that IS honestly knowable: real
 * follower movement, a real best-performing post, and real weekly totals.
 */
import { config } from '../config.js';

export interface WeeklyBestPost {
  text: string;
  postUrl: string;
  likes: number;
  replies: number;
}

export interface WeeklyCounts {
  like: number;
  comment: number;
  follow: number;
  bookmark: number;
  repost: number;
  quote: number;
}

/** Follower movement for the week, compared with the week before. */
export interface WeeklyGrowth {
  followers: number;
  /** Change over the week just finished. Null if there weren't two readings
   *  spanning it (a fresh account, or a browser that stayed closed all week). */
  changeThisWeek: number | null;
  /** Change over the week BEFORE that, for the "vs last week" comparison. Can
   *  be present even when `changeThisWeek` isn't, and vice versa. */
  changeLastWeek: number | null;
}

export interface WeeklySummaryData {
  firstName: string;
  /** "8–14 September 2026" — the week just finished. */
  weekRangeLabel: string;
  growth: WeeklyGrowth | null;
  bestPost: WeeklyBestPost | null;
  counts: WeeklyCounts;
  totalActions: number;
  unsubscribeUrl: string;
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Same palette as the daily email — one brand, one template family.
const PAGE = '#0e0e0e';
const CARD = '#141414';
const SURFACE = '#1b1b1b';
const INSET = '#161616';
const BORDER = '#2e2e2e';
const FG = '#f4f4f5';
const MUTED = '#a1a1aa';
const CORAL = '#f44d60';
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

const changeLabel = (n: number): string => `${n >= 0 ? '+' : ''}${n.toLocaleString()}`;

export const renderWeeklySummary = (
  d: WeeklySummaryData,
): { subject: string; html: string; text: string } => {
  const s = d.totalActions === 1 ? '' : 's';
  const subject =
    d.growth?.changeThisWeek !== null && d.growth?.changeThisWeek !== undefined
      ? `👻 ${changeLabel(d.growth.changeThisWeek)} followers this week`
      : `👻 Your Ghostly247 week — ${d.totalActions} action${s}`;

  const vsLastWeek =
    d.growth?.changeThisWeek !== null &&
    d.growth?.changeThisWeek !== undefined &&
    d.growth?.changeLastWeek !== null &&
    d.growth?.changeLastWeek !== undefined
      ? d.growth.changeThisWeek - d.growth.changeLastWeek
      : null;

  const heroSection = d.growth
    ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
            <tr><td style="background:${CORAL_TINT};border:1px solid ${BORDER};border-radius:14px;padding:16px 18px">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED}">Followers</div>
              <div style="font-size:30px;font-weight:700;color:${FG};margin-top:4px">${d.growth.followers.toLocaleString()}</div>
              ${
                d.growth.changeThisWeek !== null
                  ? `<div style="font-size:14px;color:${d.growth.changeThisWeek >= 0 ? CORAL_BRIGHT : MUTED};margin-top:3px">${changeLabel(d.growth.changeThisWeek)} this week</div>`
                  : `<div style="font-size:13px;color:${MUTED};margin-top:3px">Not enough readings yet to say how this week went.</div>`
              }
              ${
                vsLastWeek !== null
                  ? `<div style="font-size:12px;color:${MUTED};margin-top:2px">${vsLastWeek === 0 ? 'Same pace as' : vsLastWeek > 0 ? `${changeLabel(vsLastWeek)} faster than` : `${changeLabel(vsLastWeek)} slower than`} last week (${changeLabel(d.growth.changeLastWeek as number)})</div>`
                  : ''
              }
            </td></tr>
          </table>`
    : '';

  const bestPostSection = d.bestPost
    ? `
      <h2 style="font-size:15px;color:${FG};margin:0 0 4px">This week's best post</h2>
      <div style="background:${INSET};border:1px solid ${BORDER};border-radius:14px;padding:14px 16px;margin:0 0 22px">
        <div style="font-size:14px;color:${FG};line-height:1.55">"${esc(d.bestPost.text)}"</div>
        <div style="margin-top:10px;font-size:12px;color:${MUTED}">
          ${d.bestPost.likes.toLocaleString()} like${d.bestPost.likes === 1 ? '' : 's'}${d.bestPost.replies > 0 ? ` · ${d.bestPost.replies.toLocaleString()} repl${d.bestPost.replies === 1 ? 'y' : 'ies'}` : ''}
          <a href="${esc(d.bestPost.postUrl)}" style="color:${CORAL_BRIGHT};text-decoration:none;margin-left:8px">View post &rarr;</a>
        </div>
      </div>`
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
            <h1 style="font-size:22px;color:${FG};margin:16px 0 4px">Your week</h1>
            <div style="font-size:13px;color:${MUTED}">${d.weekRangeLabel}</div>
          </div>
          <p style="font-size:14px;color:${MUTED};line-height:1.6;margin:22px 0 18px">
            Hi ${esc(d.firstName)} — here's how the week went. 👀
          </p>
          ${heroSection}
          ${bestPostSection}
          <h2 style="font-size:15px;color:${FG};margin:0 0 12px">This week, in total</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>${statTile(d.counts.like, 'Likes')}${statTile(d.counts.comment, 'Replies')}${statTile(d.counts.follow, 'Follows')}</tr>
            <tr>${statTile(d.counts.bookmark, 'Bookmarks')}${statTile(d.counts.repost, 'Reposts')}${statTile(d.counts.quote, 'Quotes')}</tr>
          </table>
          <p style="font-size:14px;color:${MUTED};line-height:1.6;margin:26px 0 4px;text-align:center">
            Nothing needs doing. I'll keep going.
          </p>
        </td></tr>
        <tr><td style="padding:26px 28px 30px">
          <div style="border-top:1px solid ${BORDER};padding-top:18px">
            <p style="font-size:12px;color:${MUTED};line-height:1.6;margin:0">
              Reviewing keeps your account safe and on-brand. Open the extension anytime to see today's activity, or hit the Active pill to pause.
            </p>
            <p style="font-size:11px;color:${MUTED};margin:14px 0 0">
              <a href="mailto:support@ghostly247.com" style="color:${CORAL};text-decoration:none">Contact support</a>
              &nbsp;·&nbsp;
              <a href="${esc(d.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Unsubscribe from weekly recaps</a>
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const lines: string[] = [
    `Your Ghostly247 week — ${d.weekRangeLabel}`,
    ``,
    `Hi ${d.firstName}, here's how the week went:`,
    ``,
    ...(d.growth
      ? [
          `Followers: ${d.growth.followers.toLocaleString()}` +
            (d.growth.changeThisWeek !== null ? ` (${changeLabel(d.growth.changeThisWeek)} this week)` : ''),
          ...(vsLastWeek !== null
            ? [
                `  ${vsLastWeek === 0 ? 'same pace as' : vsLastWeek > 0 ? `${changeLabel(vsLastWeek)} faster than` : `${changeLabel(vsLastWeek)} slower than`} last week (${changeLabel(d.growth.changeLastWeek as number)})`,
              ]
            : []),
          ``,
        ]
      : []),
    ...(d.bestPost
      ? [
          `This week's best post (${d.bestPost.likes.toLocaleString()} like${d.bestPost.likes === 1 ? '' : 's'}):`,
          `"${d.bestPost.text}"`,
          d.bestPost.postUrl,
          ``,
        ]
      : []),
    `This week, in total:`,
    `Likes: ${d.counts.like}`,
    `Replies: ${d.counts.comment}`,
    `Follows: ${d.counts.follow}`,
    `Bookmarks: ${d.counts.bookmark}`,
    `Reposts: ${d.counts.repost}`,
    `Quotes: ${d.counts.quote}`,
    ``,
    `Nothing needs doing. I'll keep going.`,
    ``,
    `Unsubscribe from weekly recaps: ${d.unsubscribeUrl}`,
  ];

  return { subject, html, text: lines.join('\n') };
};
