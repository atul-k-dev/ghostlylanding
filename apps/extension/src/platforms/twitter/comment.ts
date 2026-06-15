import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor } from './dom.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Extract the textual body of the focal post (the article currently in view or the first one). */
export const extractPostText = (article?: HTMLElement): string => {
  const root = article ?? document.querySelector<HTMLElement>(S.postArticle);
  if (!root) return '';
  const textEl = root.querySelector<HTMLElement>(S.postText);
  if (!textEl) return root.innerText.slice(0, 2_000).trim();
  return textEl.innerText.trim();
};

/**
 * Type into a Twitter contenteditable. Twitter's editor is a draft.js-style
 * surface — setting innerText or value doesn't trigger React. document.execCommand
 * still works on contenteditables and dispatches the right events.
 */
export const typeIntoComposer = async (composer: HTMLElement, text: string): Promise<void> => {
  composer.focus();
  await sleep(150);
  // Select all and delete to clear any draft
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  await sleep(80);
  document.execCommand('insertText', false, text);
  composer.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
  await sleep(200);
};

export const submitComment = async (
  commentText: string,
): Promise<{ posted: boolean; error?: string }> => {
  const composer = await waitFor<HTMLElement>(S.replyComposer, 12_000);
  if (!composer) return { posted: false, error: 'reply composer not found' };

  await typeIntoComposer(composer, commentText);

  // Wait briefly for the submit button to enable
  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 12; i++) {
    btn = document.querySelector<HTMLButtonElement>(S.replyButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await sleep(250);
  }
  if (!btn) return { posted: false, error: 'reply submit button not found' };
  if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    return { posted: false, error: 'reply submit button never enabled' };
  }

  btn.click();

  // Verify: composer empties out or page navigates briefly
  for (let i = 0; i < 16; i++) {
    await sleep(400);
    const current = document.querySelector<HTMLElement>(S.replyComposer);
    const text = current?.innerText.trim() ?? '';
    if (!current || text.length === 0) return { posted: true };
  }
  return { posted: false, error: 'composer did not clear after submit' };
};
