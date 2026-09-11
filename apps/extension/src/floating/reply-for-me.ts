/**
 * "Reply for me" (updateplan 2.4).
 *
 * The autopilot decides what to reply to. This is the other half: the user is
 * reading a post, wants to say something, and would rather not write it. Hover
 * a post, press Reply for me, and the draft arrives in the panel with three
 * ways out — post it, change it, never mind.
 *
 * Two things it is emphatically NOT:
 *
 *   · a bypass. It passes the same gates the engine passes (daily cap, free
 *     monthly allowance, hourly ceiling) via `CAN_REPLY`, records the action the
 *     same way, and spends the same budget. A manual action that skipped them
 *     would make every safety number in the product a lie.
 *   · a second reply implementation. Drafting is `DRAFT_COMMENT`, the same
 *     handler the engine uses; posting is `postReplyInArticle`, the same DOM
 *     dance, extracted in this step so both callers share it.
 */
import { TWITTER_SELECTORS as S } from '../platforms/twitter/selectors.js';
import {
  readArticle,
  findArticleById,
  postReplyInArticle,
} from '../platforms/twitter/autopilot.js';

/** Below this a post is too short to answer without inventing a reaction. */
const MIN_POST_CHARS = 40;

const BUTTON_CLASS = 'ghostly247-reply-for-me';
const MARK_ATTR = 'data-ghostly-rfm';

export type ReplyForMeState =
  | { status: 'idle' }
  | { status: 'drafting'; post: ReplyPost }
  | { status: 'ready'; post: ReplyPost; draft: string; draftId?: string }
  | { status: 'posting'; post: ReplyPost; draft: string; draftId?: string }
  | { status: 'posted'; post: ReplyPost }
  | { status: 'error'; post: ReplyPost; message: string };

export interface ReplyPost {
  postId: string;
  postUrl: string;
  authorHandle: string | null;
  text: string;
}

/* -- the store -------------------------------------------------------------- */

type Listener = (state: ReplyForMeState) => void;
const listeners = new Set<Listener>();
let state: ReplyForMeState = { status: 'idle' };

export const getReplyForMe = (): ReplyForMeState => state;

export const subscribeReplyForMe = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const publish = (next: ReplyForMeState): void => {
  state = next;
  for (const fn of listeners) fn(next);
};

export const dismissReplyForMe = (): void => publish({ status: 'idle' });

/* -- drafting --------------------------------------------------------------- */

const draftFor = async (post: ReplyPost): Promise<void> => {
  publish({ status: 'drafting', post });
  try {
    const resp = (await chrome.runtime.sendMessage({
      type: 'DRAFT_COMMENT',
      payload: { platform: 'twitter', postText: post.text, postUrl: post.postUrl },
    })) as
      | { ok: true; data: { id?: string; draftText: string } }
      | { ok: false; error: { message?: string } | string }
      | undefined;

    if (!resp) {
      publish({ status: 'error', post, message: 'I could not reach the server just now.' });
      return;
    }
    if (!resp.ok) {
      const message =
        typeof resp.error === 'string'
          ? resp.error
          : (resp.error?.message ?? 'That did not work.');
      publish({ status: 'error', post, message });
      return;
    }
    publish({
      status: 'ready',
      post,
      draft: resp.data.draftText,
      ...(resp.data.id ? { draftId: resp.data.id } : {}),
    });
  } catch (err) {
    publish({
      status: 'error',
      post,
      message: err instanceof Error ? err.message : 'That did not work.',
    });
  }
};

/* -- posting ---------------------------------------------------------------- */

/** What to say when a gate says no. One sentence, and it names the real reason. */
const GATE_MESSAGE: Record<string, string> = {
  'caps-spent': "That's today's safe limit for replies — this one can go out tomorrow.",
  'free-cap': "That's your free allowance for this month.",
  hourly: "I've replied a lot in the last hour. Give it a few minutes and press it again.",
};

/**
 * Post the text the user approved.
 *
 * `generated` is what the model wrote; `text` is what the user is sending. When
 * they differ that pair is the single most valuable signal there is about the
 * user's voice, so it is kept for Phase 6.3 rather than thrown away.
 */
export const postReplyForMe = async (
  post: ReplyPost,
  text: string,
  generated: string,
  draftId?: string,
): Promise<void> => {
  publish({ status: 'posting', post, draft: text, ...(draftId ? { draftId } : {}) });

  // The same gates the engine passes. Never a bypass.
  try {
    const gate = (await chrome.runtime.sendMessage({ type: 'CAN_REPLY', payload: {} })) as
      | { ok: true; data: { allowed: boolean; reason?: string } }
      | undefined;
    if (gate?.ok && !gate.data.allowed) {
      const reason = gate.data.reason ?? '';
      publish({
        status: 'error',
        post,
        message: GATE_MESSAGE[reason] ?? "I can't send that one right now.",
      });
      return;
    }
  } catch {
    /* if the gate itself is unreachable we fall through to the post attempt,
       which the service worker still counts when it lands */
  }

  const article = findArticleById(post.postId);
  if (!article) {
    publish({
      status: 'error',
      post,
      message: 'That post has scrolled out of the timeline — open it and try again.',
    });
    return;
  }

  const result = await postReplyInArticle(article, text);
  if (!result.posted) {
    publish({ status: 'error', post, message: result.error ?? 'X would not take the reply.' });
    return;
  }

  // Counts exactly like any other reply: counter, action log, dedupe mark,
  // monthly bump, and the rolling hourly window (via incrementCounter).
  try {
    await chrome.runtime.sendMessage({
      type: 'RECORD_ACTION',
      payload: {
        platform: 'twitter',
        actionType: 'comment',
        postUrl: post.postUrl,
        postId: post.postId,
        ...(draftId ? { draftId } : {}),
      },
    });
  } catch {
    /* the reply is out; an undercount is the lesser problem */
  }

  const edited = text.trim() !== generated.trim();
  if (edited) {
    try {
      await chrome.runtime.sendMessage({
        type: 'RECORD_CORRECTION',
        payload: { postText: post.text, generated, corrected: text },
      });
    } catch {
      /* voice tuning is a nice-to-have; posting was the point */
    }
  }

  // The trust streak (updateplan 3.3) counts approvals wherever they happen. A
  // reply sent from this button unchanged is the same evidence as one approved
  // in Review, and one rewritten here is the same reset.
  try {
    await chrome.runtime.sendMessage({
      type: 'RECORD_APPROVAL',
      payload: { edited, subject: 'reply' },
    });
  } catch {
    /* the reply is out; the streak is bookkeeping */
  }

  publish({ status: 'posted', post });
};

/* -- the button ------------------------------------------------------------- */

/**
 * One stylesheet rule set, scoped to our own class — it can't reach anything
 * else on X, and unlike inline styles it can do :hover and :focus-visible. The
 * colours come from the user's Appearance via --ghostly-accent (set by
 * mount.ts), falling back to Twitter blue.
 */
const STYLE_ID = 'ghostly247-reply-for-me-style';
const ensureStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.${BUTTON_CLASS} {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  margin-left: 8px;
  padding: 0 12px 0 8px;
  border-radius: 9999px;
  border: 1px solid color-mix(in oklch, var(--ghostly-accent, #1d9bf0) 45%, transparent);
  background: color-mix(in oklch, var(--ghostly-accent, #1d9bf0) 14%, transparent);
  color: rgb(113, 118, 123);
  font: 600 13px/1 TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  letter-spacing: 0;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, transform 0.1s;
}
.${BUTTON_CLASS}:hover {
  background: color-mix(in oklch, var(--ghostly-accent, #1d9bf0) 26%, transparent);
  border-color: var(--ghostly-accent, #1d9bf0);
  color: var(--ghostly-accent-ink, #1d9bf0);
}
.${BUTTON_CLASS}:active { transform: scale(0.97); }
.${BUTTON_CLASS}:focus-visible { outline: 2px solid var(--ghostly-accent, #1d9bf0); outline-offset: 2px; }
.${BUTTON_CLASS} .ghostly247-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: var(--ghostly-accent, #1d9bf0);
  color: #0f1419;
}
.${BUTTON_CLASS} svg { width: 13px; height: 13px; display: block; }
`;
  (document.head ?? document.documentElement).appendChild(style);
};

/** A small ghost, drawn rather than an emoji so it renders the same everywhere. */
const GHOST_SVG =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 21V10a7 7 0 0 1 14 0v11l-2.33-1.75L14.33 21 12 19.25 9.67 21l-2.34-1.75L5 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9.5" cy="10.5" r="1.25" fill="currentColor"/><circle cx="14.5" cy="10.5" r="1.25" fill="currentColor"/></svg>';

const makeButton = (post: ReplyPost): HTMLButtonElement => {
  ensureStyle();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.innerHTML = `<span class="ghostly247-icon">${GHOST_SVG}</span><span>Reply for me</span>`;
  button.setAttribute('aria-label', 'Ask Ghostly to write a reply to this post');
  button.title = 'Ghostly writes a reply — you read it before it posts';

  button.addEventListener('click', (e) => {
    // X's action bar is inside the post's own click target: without this, asking
    // for a draft would also open the post.
    e.preventDefault();
    e.stopPropagation();
    void draftFor(post);
  });

  return button;
};

const decorate = (article: HTMLElement): void => {
  if (article.getAttribute(MARK_ATTR) === '1') return;
  const bar = article.querySelector<HTMLElement>(S.actionBarRow);
  if (!bar) return;
  const meta = readArticle(article);
  if (!meta || meta.text.trim().length < MIN_POST_CHARS) return;

  article.setAttribute(MARK_ATTR, '1');
  bar.appendChild(
    makeButton({
      postId: meta.postId,
      postUrl: meta.postUrl,
      authorHandle: meta.authorHandle,
      text: meta.text,
    }),
  );
};

const undecorate = (article: HTMLElement): void => {
  article.removeAttribute(MARK_ATTR);
  article.querySelectorAll(`.${BUTTON_CLASS}`).forEach((b) => b.remove());
};

/**
 * One delegated listener rather than a listener per post: X's timeline is
 * virtualised and recycles articles constantly, so anything attached per element
 * leaks by design.
 */
export const installReplyForMe = (): void => {
  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const article = target.closest<HTMLElement>(S.postArticle);
      if (article) decorate(article);
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const article = target.closest<HTMLElement>(S.postArticle);
      if (!article) return;
      // `relatedTarget` is where the pointer went. Still inside this post means
      // the pointer is just moving between its own children.
      const to = e.relatedTarget;
      if (to instanceof Node && article.contains(to)) return;
      undecorate(article);
    },
    true,
  );
};
