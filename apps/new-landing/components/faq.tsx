"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const QA = [
  {
    q: "Will this get my account banned?",
    a: "We can't promise it won't. Automated engagement sits against X's terms however carefully it's paced, and anyone telling you otherwise is selling something. What Ghostly does is take every conservative option: it acts from your own browser session at human speed, with randomised delays, daily caps that scale with your account's age, a 48-hour freshness filter, and an auto-pause the moment X returns anything unexpected. You run it at your own discretion.",
  },
  {
    q: "Do you need my X password?",
    a: "No, and we'd refuse it if you offered. Ghostly works inside the session you're already signed into, in your own browser. There is no server anywhere logging into X as you, and no credential is ever collected or stored.",
  },
  {
    q: "Does it keep working when my browser is closed?",
    a: "No. Everything runs in your browser, which is exactly what makes it safer than cloud tools — but it also means Chrome has to be open. A post scheduled for a moment when your browser is shut goes out as soon as you next open it.",
  },
  {
    q: "Will the replies sound like a bot?",
    a: "That's the thing voice training exists to prevent. Ghostly reads your last ~50 posts and learns how you actually write, then writes every reply that way — and it overrides the tone presets rather than averaging with them. Turn on the review queue and you can read each one in context before it goes anywhere.",
  },
  {
    q: "What counts as an action?",
    a: "A like, reply, follow, bookmark, repost or quote. Reading your own profile for the growth scoreboard doesn't count, and neither does drafting a post you never schedule. Free gives you 50 a month, reset on the 1st.",
  },
  {
    q: "What happens to my posts when you train the voice?",
    a: "They're analysed in memory and thrown away. Only a short style summary is kept — you can read it in Settings and delete it whenever you like. Post text sent for reply generation isn't stored beyond the request.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from the Stripe billing portal in the extension. You keep Pro until the period you've paid for ends, then drop back to the free 50 a month. Deleting your account hard-wipes everything — profile, logs, drafts, settings.",
  },
  {
    q: "Does it work on LinkedIn?",
    a: "Not any more. Ghostly is X-only and built that way on purpose — one platform, done properly, rather than two done shallowly.",
  },
];

function Item({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Reveal delay={i * 0.04}>
      <div
        style={{
          background: "var(--card)",
          borderRadius: 24,
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-5 p-6 text-left"
        >
          <span className="t-h5" style={{ color: "var(--ink)" }}>
            {q}
          </span>
          <span
            aria-hidden="true"
            className="grid size-8 flex-none place-items-center rounded-full transition-transform duration-300"
            style={{
              background: "var(--line-2)",
              transform: open ? "rotate(45deg)" : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2v10M2 7h10"
                stroke="var(--ink)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.44, 0, 0.22, 1] }}
              className="overflow-hidden"
            >
              <p
                className="t-body max-w-[820px] px-6 pb-6"
                style={{ color: "var(--zinc)" }}
              >
                {a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export function FAQ() {
  return (
    <Section id="faq">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Questions"
          title="The ones people actually ask"
          body="Including the awkward one, answered honestly."
        />

        <div className="flex w-full max-w-[900px] flex-col gap-3">
          {QA.map((item, i) => (
            <Item key={item.q} q={item.q} a={item.a} i={i} />
          ))}
        </div>
      </Shell>
    </Section>
  );
}
