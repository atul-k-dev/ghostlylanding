/* eslint-disable no-console */
/**
 * Condition-table smoke (updateplan 1.7).
 *
 * Two jobs:
 *
 *  1. **The copy is fixed.** `docs/ui-copy.md` is the source of truth for all
 *     fifteen states, and this suite PARSES that document and compares it,
 *     character for character, with the table in `sidepanel/conditions.ts`. A
 *     reworded string — in either place — fails the build. That is the whole
 *     point: the copy was written against the specific failure it describes,
 *     and the usual way it dies is someone "improving" it in passing.
 *
 *  2. **The rules hold.** One card at a time, engine beats notice, `paused` is
 *     the one state a notice may replace, two states have no button and one has
 *     two, and a placeholder is never rendered with a hole or a guessed number.
 *
 * Run with: pnpm --filter @casper/extension conditions-smoke
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ENGINE_COPY,
  NOTICE_COPY,
  engineCard,
  noticeCard,
  fill,
  pickCode,
  resolveNotice,
  PROFILE_QUIET_MS,
  type NoticeCode,
} from '../src/sidepanel/conditions.js';
import { BLOCK_REASON_PRECEDENCE, type BlockReasonCode } from '../src/scheduler/block-reason.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};
const eq = (actual: unknown, expected: unknown, label: string) => {
  const ok = actual === expected;
  assert(ok, ok ? label : `${label}\n    got:  ${String(actual)}\n    want: ${String(expected)}`);
};

/* -- parse docs/ui-copy.md -------------------------------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const DOC = join(here, '..', '..', '..', 'docs', 'ui-copy.md');
const doc = readFileSync(DOC, 'utf8');

/** Strip the doc's markdown emphasis and its "(none)" spellings. */
const cell = (raw: string): string | null => {
  const text = raw.trim().replace(/\*\*/g, '').replace(/`/g, '');
  if (/^\*?\(none/.test(text) || text === '') return null;
  return text;
};

interface DocRow {
  key: string;
  title: string;
  body: string | null;
  buttons: string[];
  tone?: string;
}

/**
 * Rows look like `| 1 | \`code\` | **Title** | Body | \`Button\` | tone |` for
 * the engine table and `| 12 | State | Source | **Title** | Body | \`Button\` |`
 * for the notice table — same shape, one extra column in the middle.
 */
const parseRows = (heading: string, keyCol: number, titleCol: number): DocRow[] => {
  const section = doc.split(heading)[1] ?? '';
  const table = section.split('\n### ')[0] ?? '';
  const rows: DocRow[] = [];
  for (const line of table.split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cols = line.split('|').slice(1, -1);
    const buttonsRaw = cell(cols[titleCol + 2] ?? '');
    rows.push({
      key: (cell(cols[keyCol] ?? '') ?? '').trim(),
      title: cell(cols[titleCol] ?? '') ?? '',
      body: cell(cols[titleCol + 1] ?? ''),
      buttons: buttonsRaw ? buttonsRaw.split('·').map((b) => b.trim()) : [],
      ...(cols[titleCol + 3] !== undefined
        ? { tone: (cell(cols[titleCol + 3] ?? '') ?? '').trim() }
        : {}),
    });
  }
  return rows;
};

const engineRows = parseRows('## A. Engine states', 1, 2);
const noticeRows = parseRows('## B. Notice states', 1, 3);

eq(engineRows.length, 11, 'doc lists 11 engine states');
eq(noticeRows.length, 4, 'doc lists 4 notice states');

/* -- 1. every string matches the doc, character for character --------------- */

for (const row of engineRows) {
  const code = row.key as BlockReasonCode;
  const mine = ENGINE_COPY[code];
  if (!mine) {
    assert(false, `engine "${row.key}" exists in the code table`);
    continue;
  }
  eq(mine.title, row.title, `${code}: title matches the doc`);
  eq(mine.body, row.body, `${code}: body matches the doc`);
  eq(mine.buttons.join(' · '), row.buttons.join(' · '), `${code}: buttons match the doc`);
  eq(mine.tone, row.tone === 'attention' ? 'attention' : 'calm', `${code}: tone matches the doc`);
}

/**
 * The notice table names states in prose ("Drafts waiting"), so this is the one
 * place the two are joined by hand. Order follows the doc's rows 12–15.
 */
const NOTICE_ORDER: NoticeCode[] = [
  'drafts-waiting',
  'profile-quiet',
  'post-failed',
  'image-failed',
];
noticeRows.forEach((row, i) => {
  const code = NOTICE_ORDER[i] as NoticeCode;
  const mine = NOTICE_COPY[code];
  eq(mine.title, row.title, `${code}: title matches the doc`);
  eq(mine.body, row.body, `${code}: body matches the doc`);
  eq(mine.buttons.join(' · '), row.buttons.join(' · '), `${code}: buttons match the doc`);
});

/* -- 2. coverage ------------------------------------------------------------ */

for (const code of BLOCK_REASON_PRECEDENCE) {
  assert(Boolean(ENGINE_COPY[code]), `every BlockReasonCode has copy: ${code}`);
}
eq(Object.keys(ENGINE_COPY).length, BLOCK_REASON_PRECEDENCE.length, 'no orphan engine copy');
eq(Object.keys(NOTICE_COPY).length, 4, 'exactly four notice states');

/* -- 3. buttons: two with none, one with two -------------------------------- */

const buttonless = BLOCK_REASON_PRECEDENCE.filter((c) => ENGINE_COPY[c].buttons.length === 0);
eq(
  buttonless.join(','),
  'server-unreachable,caps-spent',
  'exactly caps-spent and server-unreachable have no button',
);
eq(engineCard('caps-spent', { resumeTime: '9am' }).actions.length, 0, 'caps-spent renders no button');
eq(
  engineCard('server-unreachable').actions.length,
  0,
  'server-unreachable renders no button — a fake retry would be worse than silence',
);
for (const code of BLOCK_REASON_PRECEDENCE) {
  if (ENGINE_COPY[code].buttons.length === 0) continue;
  eq(
    engineCard(code, { n: 3, resumeTime: '9am', startHour: '9am' }).actions.length,
    1,
    `${code}: exactly one button, and it is wired`,
  );
}
const imageCard = noticeCard({ code: 'image-failed', postId: 'p1', scheduledAt: 0 });
eq(imageCard.actions.length, 2, 'image-failed is the one two-button card');
eq(
  imageCard.actions[0]?.label,
  'Post without image',
  'image-failed: dropping the image comes first',
);
assert(
  imageCard.actions[0]?.kind === 'retry-post' && imageCard.actions[0].dropImage === true,
  'image-failed: "Post without image" actually drops the image',
);
assert(
  imageCard.actions[1]?.kind === 'retry-post' && imageCard.actions[1].dropImage === false,
  'image-failed: "Retry" keeps it',
);

/* -- 4. placeholders -------------------------------------------------------- */

eq(
  engineCard('nothing-matched', { n: 42 }).title,
  'Skipped 42 posts — nothing matched your topics.',
  'nothing-matched fills the skipped count',
);
eq(engineCard('nothing-matched', { n: 42 }).tone, 'calm', 'nothing-matched is calm, never an error');
eq(
  engineCard('caps-spent', { resumeTime: '9am' }).body,
  "I've used today's safe limit — back at 9am.",
  'caps-spent fills the resume time',
);
eq(
  engineCard('outside-hours', { startHour: '9am' }).title,
  'Resting until 9am.',
  'outside-hours fills the start hour',
);
eq(
  engineCard('free-cap', { n: 50 }).title,
  "You've used your 50 free actions this month.",
  'free-cap fills the allowance',
);
eq(
  noticeCard({ code: 'post-failed', postId: 'p1' }, { weekday: 'Tuesday' }).title,
  "Tuesday's post didn't go out — the browser restarted mid-publish.",
  'post-failed fills the weekday',
);
eq(
  noticeCard({ code: 'profile-quiet' }, { n: 118 }).body,
  'I sent 118 people there this week. Want me to write something?',
  'profile-quiet fills the visit count when we have it',
);
eq(
  noticeCard({ code: 'profile-quiet' }, { n: null }).body,
  'Want me to write something?',
  'profile-quiet drops the sentence rather than guessing a number',
);
assert(
  !(fill('I sent {n} people there. Want me to write something?', { n: null }) ?? '').includes('{'),
  'a dropped placeholder never leaves a hole in the string',
);
eq(
  fill('Nothing to say about {n}.', { n: undefined }),
  null,
  'a card with nothing left to say says nothing',
);

/* -- 5. resolving the notices ----------------------------------------------- */

const now = Date.UTC(2026, 8, 10, 12);
const day = 24 * 60 * 60 * 1000;
const base = { failedPosts: [], pendingReplies: 0, lastPostedAt: null, now } as const;

eq(resolveNotice(base), null, 'a healthy, quiet install shows no notice');
eq(resolveNotice({ ...base, pendingReplies: 3 })?.code, 'drafts-waiting', 'drafts waiting');
eq(
  resolveNotice({ ...base, lastPostedAt: now - 6 * day })?.code,
  'profile-quiet',
  'six days without a post is quiet',
);
eq(resolveNotice({ ...base, lastPostedAt: now - 4 * day }), null, 'four days is not quiet yet');
eq(
  resolveNotice({ ...base, lastPostedAt: now - PROFILE_QUIET_MS })?.code,
  'profile-quiet',
  'exactly five days is quiet',
);
eq(
  resolveNotice({ ...base, lastPostedAt: null, pendingReplies: 0 }),
  null,
  'a profile that has NEVER published is new, not quiet',
);
eq(
  resolveNotice({
    ...base,
    pendingReplies: 5,
    lastPostedAt: now - 30 * day,
    failedPosts: [{ id: 'a', scheduledAt: now - day, error: 'interrupted (browser restarted)' }],
  })?.code,
  'post-failed',
  'a failure beats the drafts and the nudge',
);
eq(
  resolveNotice({
    ...base,
    pendingReplies: 5,
    failedPosts: [{ id: 'b', scheduledAt: now - day, error: 'could not attach image' }],
  })?.code,
  'image-failed',
  'an image failure is its own card, not a generic one',
);
eq(
  resolveNotice({
    ...base,
    failedPosts: [
      { id: 'img', scheduledAt: now - day, error: 'could not attach image' },
      { id: 'gone', scheduledAt: now - 2 * day, error: 'tab driver failed' },
    ],
  })?.code,
  'post-failed',
  'a plain failure outranks an image one even when it is older',
);
eq(
  resolveNotice({
    ...base,
    failedPosts: [
      { id: 'old', scheduledAt: now - 5 * day, error: 'tab driver failed' },
      { id: 'new', scheduledAt: now - day, error: 'tab driver failed' },
    ],
  })?.postId,
  'new',
  'the newest failure is the one reported',
);

/* -- 6. which card wins ------------------------------------------------------ */

const drafts = { code: 'drafts-waiting' as const };
eq(pickCode('signed-out', drafts).engine, 'signed-out', 'an engine state beats a notice');
eq(pickCode('signed-out', drafts).notice, null, 'and the notice waits — never two cards');
eq(
  pickCode('paused', drafts).notice?.code,
  'drafts-waiting',
  'paused is the one state a notice may replace',
);
eq(pickCode('paused', drafts).engine, null, 'still only one card while paused');
eq(pickCode('paused', null).engine, 'paused', 'paused alone still shows');
eq(pickCode(null, drafts).notice?.code, 'drafts-waiting', 'a healthy engine shows the notice');
eq(pickCode(null, null).notice, null, 'nothing to say means no card');
for (const code of BLOCK_REASON_PRECEDENCE) {
  const chosen = pickCode(code, drafts);
  assert(
    !(chosen.engine !== null && chosen.notice !== null),
    `never two cards at once: ${code} + a notice`,
  );
}

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 conditions-smoke OK');
