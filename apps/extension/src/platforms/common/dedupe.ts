import type { Platform } from '@casper/shared';
import { isAlreadyLiked } from '../../lib/storage.js';

/** Extract a stable post identifier from a Twitter/X status URL. */
export const extractPostId = (_platform: Platform, url: string): string | null => {
  try {
    // /<handle>/status/<id> — id can be followed by /photo/1 etc.
    const m = new URL(url).pathname.match(/\/status\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
};

export const shouldSkipAsDuplicate = async (
  platform: Platform,
  url: string,
): Promise<boolean> => {
  const id = extractPostId(platform, url);
  if (!id) return false; // Couldn't parse — let the executor decide
  return await isAlreadyLiked(platform, id);
};
