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
}

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
