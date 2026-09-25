"use client";

import { useEffect, useState } from "react";
import { clearSavedCode, readSavedCode, sendCodeToExtension } from "@/lib/referral";

type State = { kind: "checking" } | { kind: "none" } | { kind: "sent"; code: string } | { kind: "failed"; code: string };

/**
 * The extension opens this page on first install. If an /invite page saved a
 * code in this browser, hand it to the extension now — retrying for a few
 * seconds, since the freshly installed service worker may still be starting.
 */
export function WelcomeClient() {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    const code = readSavedCode();
    if (!code) {
      setState({ kind: "none" });
      return;
    }
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        if (await sendCodeToExtension(code)) {
          clearSavedCode();
          if (!cancelled) setState({ kind: "sent", code });
          return;
        }
        await new Promise((r) => setTimeout(r, 800));
      }
      if (!cancelled) setState({ kind: "failed", code });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = [
    "Pin Ghostly247 — click the puzzle piece in Chrome's toolbar, then the pin.",
    "Click the Ghostly icon to open the side panel.",
    "Create your account and connect your X session.",
  ];

  return (
    <>
      {state.kind === "sent" && (
        <p className="mx-auto mt-8 max-w-md rounded-sm border border-emerald-green/30 bg-shadow-tint px-5 py-4 font-inter text-base text-halo-pale">
          Your invite code <span className="font-mono font-semibold tracking-widest text-ghost-white">{state.code}</span> is
          saved — it&rsquo;s filled in for you when you sign up.
        </p>
      )}
      {state.kind === "failed" && (
        <p className="mx-auto mt-8 max-w-md rounded-sm border border-goldenrod/30 bg-shadow-tint px-5 py-4 font-inter text-base text-halo-pale">
          We couldn&rsquo;t pass your invite code to the extension. When you sign up, tap &ldquo;Have an invite
          code?&rdquo; and enter{" "}
          <span className="font-mono font-semibold tracking-widest text-ghost-white select-all">{state.code}</span>.
        </p>
      )}

      <ol className="mx-auto mt-10 max-w-md space-y-4 text-left">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-4 font-inter text-base text-halo-pale">
            <span className="font-geist text-[12px] leading-6 tracking-widest text-iron-slate">0{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </>
  );
}
