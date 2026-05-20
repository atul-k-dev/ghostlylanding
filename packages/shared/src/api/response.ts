/**
 * All API responses follow this shape — see CONTEXT.md §12.
 */
export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export const ok = <T>(data: T): ApiResponse<T> => ({ ok: true, data });

export const err = (code: string, message: string): ApiResponse<never> => ({
  ok: false,
  error: { code, message },
});
