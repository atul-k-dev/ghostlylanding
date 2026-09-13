"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const QA = [
  {
    q: "What do I need to do each day?",
    a: "Nothing, really. Ghostly works on its own during your hours. If you keep reply approval on, just check your waiting replies when you have a minute.",
  },
  {
    q: "Can I choose what it does?",
    a: "Yes. Turn each action — like, reply, follow, bookmark, repost, quote — on or off. You also pick your topics, the people to watch, your pace and your hours.",
  },
  {
    q: "Will this get my account banned?",
    a: "No tool can promise that — X's own rules on automation apply. Ghostly keeps things as safe as it can: it uses your own browser, moves at a human pace, stays inside daily limits, and pauses by itself if something looks wrong.",
  },
  {
    q: "Do you need my X password?",
    a: "No, never. Ghostly works inside the X account you're already signed into in Chrome.",
  },
  {
    q: "Will the replies sound like a bot?",
    a: "No. Ghostly learns from your own posts, so replies sound like you. And by default, every reply waits for your OK before it goes out.",
  },
  {
    q: "Does it answer my mentions?",
    a: "Yes. When someone replies to you or mentions you, Ghostly writes an answer that fits the conversation — and it follows the same approval setting as every other reply.",
  },
  {
    q: "Does it work when my browser is closed?",
    a: "No — Chrome needs to be open, because Ghostly works from your own browser. Scheduled posts go out as soon as you open it again.",
  },
  {
    q: "What counts as an action?",
    a: "A like, reply, follow, bookmark, repost or quote. Checking your stats, previews and skipped drafts don't count. Free gives you 50 a month.",
  },
  {
    q: "What happens to my posts when it learns my voice?",
    a: "They're read once and thrown away. Ghostly keeps only a short note about your writing style, which you can see or delete anytime.",
  },
  {
    q: "Can I cancel?",
    a: "Anytime, in one click from the extension. Delete your account and everything is erased for good.",
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
          className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left sm:gap-5 sm:p-6"
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
                className="t-body max-w-[820px] px-5 pb-5 sm:px-6 sm:pb-6"
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
          title="Common questions"
          body="Simple answers, honestly."
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
