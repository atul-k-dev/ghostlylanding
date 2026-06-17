"use client";

/** Client-side admin session storage. The JWT is the same one the extension
 *  uses; we just keep it in localStorage for the admin SPA. */
const TOKEN_KEY = "casper.admin.token";
const EMAIL_KEY = "casper.admin.email";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setSession = (token: string, email: string): void => {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(EMAIL_KEY, email);
};

export const getEmail = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMAIL_KEY);
};

export const clearSession = (): void => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
};
