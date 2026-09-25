"use client";

import { useEffect, useState } from "react";
import { clearSavedCode, readSavedCode, sendCodeToExtension } from "@/lib/referral";

type State =
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "sent"; code: string }
  | { kind: "failed"; code: string };

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
    <div className="mt-4 flex w-full flex-col items-center gap-6">
      {state.kind === "sent" && (
        <p className="t-body rounded-2xl px-5 py-4" style={{ background: "var(--line-2)", color: "var(--zinc)" }}>
          Your invite code{" "}
          <span className="font-mono font-semibold tracking-widest" style={{ color: "var(--ink)" }}>
            {state.code}
          </span>{" "}
          is saved — it&rsquo;s filled in for you when you sign up.
        </p>
      )}
      {state.kind === "failed" && (
        <p className="t-body rounded-2xl px-5 py-4" style={{ background: "var(--line-2)", color: "var(--zinc)" }}>
          We couldn&rsquo;t pass your invite code to the extension. When you sign up, tap “Have an invite
          code?” and enter{" "}
          <span className="font-mono font-semibold tracking-widest select-all" style={{ color: "var(--ink)" }}>
            {state.code}
          </span>
          .
        </p>
      )}

      <ol className="flex w-full max-w-[440px] flex-col gap-4 text-left">
        {steps.map((step, i) => (
          <li key={step} className="t-body flex gap-4" style={{ color: "var(--zinc)" }}>
            <span
              className="t-sm-med grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ background: "var(--line-2)", color: "var(--ink)" }}
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
