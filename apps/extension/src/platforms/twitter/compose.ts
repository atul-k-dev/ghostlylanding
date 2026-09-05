/**
 * Publish an ORIGINAL tweet on X's standalone composer (/compose/post).
 *
 * Reuses the reply composer's Lexical-aware paste path (typeIntoComposer) to set
 * the text, and — when an image is provided — injects it into X's hidden file
 * input via a DataTransfer, then waits for the media thumbnail to confirm it
 * attached. It never clicks Post unless the intended image actually attached, so
 * a scheduled post can't go out missing its image.
 */
import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor, wait } from './dom.js';
import { typeIntoComposer } from './comment.js';

interface PublishArgs {
  text: string;
  link?: string;
  imageDataUrl?: string | null;
  /** Follow-up tweets, posted as one thread with `text` as the opener. */
  thread?: string[];
}

/** The composer box for tweet `index` of a thread (0 = the opener). */
const threadComposerSelector = (index: number): string =>
  `div[data-testid="tweetTextarea_${index}"]`;

/**
 * Add the rest of a thread to the open composer.
 *
 * Returns an error string on the first step that fails. The caller MUST NOT post
 * in that case: clicking Post with a half-built thread publishes a truncated
 * one, which can't be fixed after the fact — the same reason the image path
 * refuses to post without its image.
 */
const buildThread = async (parts: string[]): Promise<string | null> => {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.trim();
    if (!part) continue;

    const addButton = document.querySelector<HTMLButtonElement>(S.composeAddButton);
    if (!addButton || addButton.getAttribute('aria-disabled') === 'true') {
      return `could not add tweet ${i + 2} of the thread`;
    }
    addButton.click();

    const box = await waitFor<HTMLElement>(threadComposerSelector(i + 1), 8_000);
    if (!box) return `thread box ${i + 2} never appeared`;
    await typeIntoComposer(box, part);
    await wait(400);

    // Confirm the text actually registered before moving on; Lexical silently
    // drops input if the box wasn't focused yet.
    if ((box.innerText ?? '').trim().length === 0) {
      return `thread tweet ${i + 2} did not register`;
    }
  }
  return null;
};

const dataUrlToFile = async (dataUrl: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type || 'image/png';
  const ext = (type.split('/')[1] ?? 'png').replace('jpeg', 'jpg');
  return new File([blob], `ghostly-${Date.now()}.${ext}`, { type });
};

/** Inject an image into the composer's file input; resolve true once attached. */
const attachImage = async (dataUrl: string): Promise<boolean> => {
  const input =
    document.querySelector<HTMLInputElement>('input[data-testid="fileInput"]') ??
    document.querySelector<HTMLInputElement>('input[type="file"][accept*="image" i]') ??
    document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) return false;

  let file: File;
  try {
    file = await dataUrlToFile(dataUrl);
  } catch {
    return false;
  }

  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for X to render the attached media (thumbnail / remove button).
  for (let i = 0; i < 30; i++) {
    await wait(300);
    if (
      document.querySelector(
        '[data-testid="attachments"], [data-testid="removeMedia"], [data-testid="tweetPhoto"]',
      )
    ) {
      return true;
    }
  }
  return false;
};

export const publishPost = async (
  args: PublishArgs,
): Promise<{ posted: boolean; error?: string }> => {
  const composer = await waitFor<HTMLElement>(S.replyComposer, 15_000);
  if (!composer) return { posted: false, error: 'composer never opened' };

  const link = args.link?.trim();
  const body = link ? `${args.text.trim()}\n\n${link}` : args.text.trim();
  if (!body) return { posted: false, error: 'empty post text' };

  await typeIntoComposer(composer, body);
  await wait(300);

  const thread = (args.thread ?? []).map((t) => t.trim()).filter(Boolean);
  if (thread.length > 0) {
    const threadError = await buildThread(thread);
    // Bail BEFORE posting — a partially built thread would publish as a
    // truncated one, and there's no undo on a public timeline.
    if (threadError) return { posted: false, error: threadError };
  }

  if (args.imageDataUrl) {
    const attached = await attachImage(args.imageDataUrl);
    // Never post without the intended image — bail so the user can retry.
    if (!attached) return { posted: false, error: 'could not attach image' };
    await wait(500);
  }

  // Wait for the Post button to enable (text registered + any upload finished).
  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 24; i++) {
    btn = document.querySelector<HTMLButtonElement>(S.replyButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await wait(300);
  }
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    return { posted: false, error: 'post button never enabled' };
  }
  btn.click();

  // Confirm the post went out: the composer clears or the page leaves /compose.
  for (let i = 0; i < 20; i++) {
    await wait(400);
    const cur = document.querySelector<HTMLElement>(S.replyComposer);
    const text = cur?.innerText.trim() ?? '';
    if (!cur || text.length === 0) return { posted: true };
    if (!location.pathname.includes('/compose')) return { posted: true };
  }
  return { posted: false, error: 'composer did not clear after posting' };
};
