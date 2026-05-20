import type { Platform } from '@casper/shared';
import { isAlreadyLiked } from '../../lib/storage.js';

/** Extract a stable post identifier from a platform URL. */
export const extractPostId = (platform: Platform, url: string): string | null => {
  try {
    const u = new URL(url);
    if (platform === 'twitter') {
      // /<handle>/status/<id> — id can be followed by /photo/1 etc.
      const m = u.pathname.match(/\/status\/(\d+)/);
      return m?.[1] ?? null;
    }
    if (platform === 'linkedin') {
      // /feed/update/urn:li:activity:1234… OR /posts/<handle>_<slug>-activity-<id>-<hash>
      const activity = u.pathname.match(/urn:li:activity:(\d+)/);
      if (activity?.[1]) return activity[1];
      const inSlug = u.pathname.match(/-activity-(\d+)-/);
      return inSlug?.[1] ?? null;
    }
    return null;
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
