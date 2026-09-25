"use client";

import { useEffect, useState } from "react";
import { INSTALL_URL } from "@/lib/install";
import { saveCode, sendCodeToExtension } from "@/lib/referral";
import { primaryButton, secondaryButton } from "./InviteShell";

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
    <>
      <div className="mx-auto mt-10 flex max-w-sm items-center justify-between gap-3 rounded-sm border border-iron-slate/20 bg-shadow-tint py-2 pr-2 pl-5">
        <span className="font-geist text-[11px] uppercase tracking-widest text-iron-slate">Invite code</span>
        <span className="font-mono text-xl font-semibold tracking-[0.2em] text-ghost-white select-all">{code}</span>
        <button type="button" onClick={() => void copy()} className={`${secondaryButton} px-4 py-2.5`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {installed ? (
        <p className="mx-auto mt-10 max-w-md font-inter text-base text-halo-pale">
          Ghostly247 is already installed, and your code is saved in it. Click the Ghostly icon in your
          toolbar and create your account — the +{bonusCredits} is applied when you sign up.
        </p>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-4">
          <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
            Add to Chrome — free
          </a>
          <p className="max-w-sm font-inter text-sm text-iron-slate">
            Install, then create your account. Your code is filled in for you — or type it into
            &ldquo;Have an invite code?&rdquo; when you sign up.
          </p>
        </div>
      )}
    </>
  );
}
