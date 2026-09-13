"use client";

import { Reveal } from "./motion-primitives";
import { Shell } from "./kit";

const GUARANTEES = [
  {
    title: "Runs in your own browser",
    body: "Ghostly acts as you, in your session, on your machine. It never asks for your X password and never signs in from a server somewhere.",
    span: true,
  },
  {
    title: "Human-paced",
    body: "Randomised delays between every action. No two ever land in the same second.",
  },
  {
    title: "Caps that know your age",
    body: "Newer accounts get conservative daily limits, with ±15% variance so the pattern never looks mechanical.",
  },
  {
    title: "Stops in ~2 seconds",
    body: "One tap on the Active pill halts everything — mid-scroll, mid-action, whenever.",
  },
  {
    title: "Sessions, not marathons",
    body: "Run for 15, 30, 45 or 60 minutes, then it pauses itself.",
  },
  {
    title: "Auto-pause on anomalies",
    body: "Anything unexpected from X and it stops on its own, then tells you what it saw in Diagnostics.",
  },
  {
    title: "Fresh posts only",
    body: "Nothing older than about 48 hours, so you're never the person replying to a week-old thread.",
  },
];

export function Safety() {
  return (
    <section
      id="safety"
      className="flex w-full flex-col items-center py-20 max-[1199px]:py-10"
    >
      <Shell>
        <Reveal>
          <div
            className="flex w-full flex-col gap-10 overflow-hidden p-14 max-[809px]:p-6"
            style={{ background: "var(--forest)", borderRadius: 32 }}
          >
            <div className="flex flex-col gap-4">
              <span
                className="t-sm-med w-fit rounded-full px-3 py-1"
                style={{ background: "var(--lime)", color: "var(--ink)" }}
              >
                Safety
              </span>
              <h2
                className="t-h2 max-w-[760px]"
                style={{ color: "var(--forest-ink)", textWrap: "balance" }}
              >
                You spent years on this account. We&apos;re not going to risk it.
              </h2>
              <p
                className="t-h6 max-w-[620px]"
                style={{ color: "var(--forest-muted)", textWrap: "balance" }}
              >
                Every safety choice in Ghostly is the conservative one. These
                aren&apos;t settings buried three menus deep — they&apos;re how
                the engine is built.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-[1023px]:grid-cols-2 max-[639px]:grid-cols-1">
              {GUARANTEES.map((g, i) => (
                <Reveal
                  key={g.title}
                  delay={i * 0.05}
                  className={g.span ? "col-span-2 max-[639px]:col-span-1" : ""}
                >
                  <div
                    className="flex h-full flex-col gap-2 p-6"
                    style={{
                      background: "var(--forest-fill)",
                      borderRadius: 24,
                    }}
                  >
                    <h3 className="t-h5" style={{ color: "var(--forest-ink)" }}>
                      {g.title}
                    </h3>
                    <p className="t-body" style={{ color: "var(--forest-muted)" }}>
                      {g.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <p className="t-sm max-w-[760px]" style={{ color: "var(--forest-faint)" }}>
              Ghostly reduces risk — it can&apos;t remove it. Automated
              engagement sits against X&apos;s terms however carefully it&apos;s
              paced, so you run it at your own discretion. We&apos;d rather say
              that here than in the small print.
            </p>
          </div>
        </Reveal>
      </Shell>
    </section>
  );
}
