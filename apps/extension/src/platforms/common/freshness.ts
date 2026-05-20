/** Default freshness window per §11 — posts older than this are skipped. */
export const FRESH_WINDOW_HOURS = 48;

export const isFresh = (publishedAt: string | null, hours = FRESH_WINDOW_HOURS): boolean => {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
};
