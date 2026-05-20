import { LINKEDIN_SELECTORS as S } from './selectors.js';
import { waitFor } from './dom.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const extractPostText = (article?: HTMLElement): string => {
  const root = article ?? document.querySelector<HTMLElement>(S.postArticle);
  if (!root) return '';
  const body = root.querySelector<HTMLElement>(S.postBody);
  return (body?.innerText ?? root.innerText.slice(0, 2_000)).trim();
};

const typeIntoComposer = async (composer: HTMLElement, text: string): Promise<void> => {
  composer.focus();
  await sleep(150);
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  await sleep(80);
  document.execCommand('insertText', false, text);
  composer.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
  await sleep(300);
};

export const submitComment = async (
  commentText: string,
): Promise<{ posted: boolean; error?: string }> => {
  // LinkedIn requires opening the comment box first
  const trigger = await waitFor<HTMLButtonElement>(S.commentTriggerButton, 12_000);
  if (trigger) {
    trigger.click();
    await sleep(800);
  }

  const composer = await waitFor<HTMLElement>(S.commentComposer, 10_000);
  if (!composer) return { posted: false, error: 'comment composer not found' };

  await typeIntoComposer(composer, commentText);

  let submit: HTMLButtonElement | null = null;
  for (let i = 0; i < 12; i++) {
    submit = document.querySelector<HTMLButtonElement>(S.commentSubmitButton);
    if (submit && !submit.disabled && submit.getAttribute('aria-disabled') !== 'true') break;
    await sleep(250);
  }
  if (!submit) return { posted: false, error: 'comment submit button not found' };
  if (submit.disabled || submit.getAttribute('aria-disabled') === 'true') {
    return { posted: false, error: 'comment submit never enabled' };
  }

  submit.click();

  for (let i = 0; i < 20; i++) {
    await sleep(400);
    const current = document.querySelector<HTMLElement>(S.commentComposer);
    const text = current?.innerText.trim() ?? '';
    if (text.length === 0) return { posted: true };
  }
  return { posted: false, error: 'composer did not clear after submit' };
};
