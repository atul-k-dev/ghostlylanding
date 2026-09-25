"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { saveCode, sendCodeToExtension } from "@/lib/referral";
import { GhostButton, PrimaryButton } from "./site-nav";

/**
 * The interactive half of /invite/<code>: remember the code for /welcome, hand
 * it straight over if the extension is already installed, and a Copy button so
 * it can always be typed in by hand.
 */
export function InviteClient({ code, bonusCredits }: { code: string; bonusCredits: number }) {
  const [copied, setCopied] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    saveCode(code);
    void sendCodeToExtension(code).then(setInstalled);
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the code is selectable on screen */
    }
  };

  return (
    <div className="mt-4 flex w-full flex-col items-center gap-6">
      <div
        className="flex w-full max-w-[380px] items-center justify-between gap-3 rounded-2xl py-2 pr-2 pl-5"
        style={{ background: "var(--line-2)" }}
      >
        <span className="t-sm" style={{ color: "var(--muted)" }}>
          Invite code
        </span>
        <span
          className="font-mono text-xl font-semibold tracking-[0.2em] select-all"
          style={{ color: "var(--ink)" }}
        >
          {code}
        </span>
        <button type="button" onClick={() => void copy()} className="btn-ghost t-nav">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {installed ? (
        <p className="t-body max-w-[42ch]" style={{ color: "var(--zinc)" }}>
          Ghostly247 is already installed, and your code is saved in it. Click the Ghostly icon in your
          toolbar and create your account — the +{bonusCredits} is added when you sign up.
        </p>
      ) : (
        <>
          <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome — free</PrimaryButton>
          <p className="t-sm max-w-[42ch]" style={{ color: "var(--muted)" }}>
            Install, then create your account. Your code is filled in for you — or type it into “Have an
            invite code?” when you sign up.
          </p>
        </>
      )}

      <GhostButton href="/">What is Ghostly247?</GhostButton>
    </div>
  );
}
