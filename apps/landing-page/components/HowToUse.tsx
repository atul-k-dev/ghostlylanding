'use client';

import React from 'react';
import { FadeIn, FadeInStagger } from './animations/FadeInStagger';

const STEPS = [
  {
    index: '01',
    label: 'INSTALL',
    title: 'Add Ghostly247 to Chrome',
    description:
      "Install the extension from the Chrome Web Store and pin it to your toolbar. Nothing to download to your computer and no servers to wire up — it lives right inside your browser.",
    points: ['ONE-CLICK CHROME INSTALL', 'PIN IT TO YOUR TOOLBAR'],
  },
  {
    index: '02',
    label: 'SIGN IN',
    title: 'Create your account',
    description:
      'Open the popup and sign up with your name, email and a password — or tap Continue with Google. Then just stay logged into Twitter / X the way you already do. Ghostly247 acts inside your own session and never asks for your X password.',
    points: ['EMAIL & PASSWORD OR GOOGLE', 'YOUR X LOGIN IS NEVER COLLECTED'],
  },
  {
    index: '03',
    label: 'CONFIGURE',
    title: 'Pick your tone & targets',
    description:
      'Choose a tone preset — friendly, professional or witty — and switch on the actions you want: like, reply, follow, bookmark, repost, quote. Add relevance keywords so it only engages posts that matter to you, plus exclude words to skip the rest. Drop in a few creator handles to target their audience.',
    points: ['3 TONE PRESETS', 'LIKE · REPLY · FOLLOW & MORE', 'RELEVANCE & EXCLUDE KEYWORDS'],
  },
  {
    index: '04',
    label: 'SET LIMITS',
    title: 'Choose your safety limits',
    description:
      'Set a session length (15–60 minutes) and tell Ghostly247 how old your account is so it picks safe daily caps. It spaces every action with random, human-like delays and auto-pauses when the session ends — so you always stay under the radar.',
    points: ['SESSION LENGTH 15–60 MIN', 'AGE-AWARE DAILY CAPS', 'RANDOM HUMAN-LIKE DELAYS'],
  },
  {
    index: '05',
    label: 'GO',
    title: 'Flip it on, wake up to a log',
    description:
      'Hit the Active pill and Ghostly247 opens a tab, smoothly scrolls your feed and engages on autopilot. Every action lands in the log with its target and timestamp, live counters tick up, and a one-tap kill switch stops everything in about two seconds.',
    points: ['LIVE DAILY COUNTERS', 'FULL ACTION LOG ✓ / ✗', 'ONE-TAP KILL SWITCH'],
  },
];

export function HowToUse() {
  return (
    <section
      id="how-to-use"
      className="relative bg-bg text-fg py-16 md:py-24 px-3 md:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1100px] px-0 sm:px-6 md:px-10">
        {/* Header */}
        <FadeInStagger
          y={24}
          stagger={0.12}
          className="flex flex-col items-center text-center mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center rounded-sm bg-[#1e1e1e] border border-border px-2 py-0.5 font-geist text-[10px] font-bold uppercase tracking-widest text-fg mb-6">
            HOW TO USE
          </div>
          <h2 className="font-aeonik text-[28px] sm:text-4xl md:text-[44px] font-medium tracking-tight leading-[1.1] text-fg mb-4">
            Up and running <br className="hidden sm:block" />
            in no time.
          </h2>
          <p className="font-inter text-[15px] leading-relaxed text-iron-slate max-w-[460px]">
            New to Ghostly247? Here is everything a first-time user does — from install to your
            first overnight run.
          </p>
        </FadeInStagger>

        {/* Steps */}
        <div className="relative flex flex-col gap-5 sm:gap-6">
          {/* Vertical connector line behind the number badges */}
          <div
            className="hidden sm:block absolute left-[27px] top-6 bottom-6 w-px bg-border"
            aria-hidden
          />

          {STEPS.map((step) => (
            <FadeIn key={step.index} y={30} className="relative flex gap-4 sm:gap-6 items-start">
              {/* Number badge */}
              <div className="relative z-10 shrink-0 flex items-center justify-center w-[56px] h-[56px] rounded-full bg-card border border-border font-aeonik text-[18px] font-medium text-fg">
                {step.index}
              </div>

              {/* Card */}
              <div className="flex-1 bg-card border border-border rounded-lg p-5 sm:p-7 transition-colors hover:border-white/25">
                <span className="font-geist text-[10px] font-bold tracking-[0.2em] text-[#ff577a]">
                  {step.label}
                </span>
                <h3 className="font-aeonik text-[20px] sm:text-[24px] font-medium text-fg mt-2 mb-2 leading-[1.2]">
                  {step.title}
                </h3>
                <p className="font-inter text-[14px] leading-relaxed text-iron-slate max-w-[640px]">
                  {step.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {step.points.map((point) => (
                    <span
                      key={point}
                      className="inline-flex items-center rounded-sm bg-[#1e1e1e] border border-border px-2.5 py-1 font-geist text-[9px] font-bold uppercase tracking-wider text-iron-slate/80"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Footer CTA */}
        <FadeIn y={20} className="mt-12 sm:mt-16 flex flex-col items-center text-center gap-4">
          <p className="font-inter text-[14px] text-iron-slate max-w-[460px]">
            Free to start — 5 actions a month, no card required. Upgrade to Pro for unlimited actions
            whenever you are ready.
          </p>
          <a
            href="#pricing"
            className="rounded-full border border-white bg-white px-6 py-3 text-[14px] font-medium text-black transition-all duration-200 hover:bg-transparent hover:text-fg"
          >
            Get Started
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
