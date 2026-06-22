"use client";
import React from 'react';
import { FadeIn, FadeInStagger } from "./animations/FadeInStagger";
import Image from 'next/image';

const STEPS = [
  {
    index: "01",
    label: "CONNECT",
    title: "Pin Ghostly247.\nStay logged in.",
    description: "Add the extension to Chrome and stay logged into Twitter / X the way you already do — Ghostly247 acts in your real browser session, never a cloud server.",
    list: [
      "ONE-CLICK CHROME INSTALL",
      "NO NEW ACCOUNTS, NO NEW PASSWORDS",
      "WORKS WITH YOUR EXISTING LOGIN"
    ],
    image: "/step-connect.png"
  },
  {
    index: "02",
    label: "SET UP",
    title: "Set your tone\n& targets.",
    description: "Pick a tone — friendly, professional, or witty — choose what to do, and add a few relevance keywords. Setup takes a couple of minutes.",
    list: [
      "THREE TONE PRESETS TO CHOOSE FROM",
      "PICK ACTIONS: LIKE, REPLY, FOLLOW & MORE",
      "RELEVANCE & EXCLUDE KEYWORDS"
    ],
    image: "/step-train.png"
  },
  {
    index: "03",
    label: "SLEEP",
    title: "Wake up to a\nfresh log.",
    description: "Ghostly247 engages on your schedule with random delays and daily caps. Every action is logged with target and timestamp — no silent activity, ever.",
    list: [
      "RANDOM 8–45S DELAYS BETWEEN ACTIONS",
      "AUTO-PAUSE WHEN YOUR SESSION ENDS",
      "FULL ACTION LOG IN THE POPUP"
    ],
    image: "/step-sleep.png"
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-bg text-fg py-16 md:py-24 px-3 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[1400px] px-0 sm:px-6 md:px-10 flex flex-col lg:flex-row gap-10 sm:gap-16 lg:gap-24 items-start relative">

        {/* Left Column - Sticky */}
        <div className="lg:w-[40%] lg:sticky lg:top-42 self-start">
          <FadeInStagger y={20} stagger={0.15}>
            <div className="inline-flex items-center rounded-sm bg-[#1e1e1e] border border-border px-2 py-0.5 font-geist text-[10px] font-bold uppercase tracking-widest text-fg mb-6">
              HOW IT WORKS
            </div>
            <h2 className="font-aeonik text-[28px] sm:text-4xl md:text-[44px] font-medium tracking-tight mb-4 sm:mb-6 leading-[1.1] text-fg">
              Connect. Train. <br className="hidden lg:block" />Sleep.
            </h2>
            <p className="font-inter text-[15px] leading-relaxed text-iron-slate max-w-[340px]">
              Three steps to set up. After that, Ghostly247 runs itself while you focus on your actual work.
            </p>
          </FadeInStagger>
        </div>

        {/* Right Column - Scrolling Cards */}
        <div className="lg:w-[65%] flex flex-col gap-6">
          {STEPS.map((step) => (
            <FadeIn
              key={step.index}
              y={40}
              className="group bg-card border border-border rounded-lg flex flex-col md:flex-row p-4 transition-colors hover:border-border"
            >
              {/* Text Side */}
              <div className="flex-1 p-3 md:p-7 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-geist text-[11px] font-bold tracking-widest text-iron-slate">
                    / {step.index}
                  </span>
                  <span className="font-geist text-[10px] font-bold tracking-[0.2em] text-[#ff577a]">
                    {step.label}
                  </span>
                </div>
                <h3 className="font-aeonik text-[22px] sm:text-[28px] font-medium text-fg mb-2 whitespace-pre-line leading-[1.15]">
                  {step.title}
                </h3>
                <p className="font-inter text-[14px] text-iron-slate mb-10 md:mb-10 max-w-[380px]">
                  {step.description}
                </p>

                <div className="mt-auto flex flex-col">
                  {step.list.map((item) => (
                    <div
                      key={item}
                      className="border-t sm:last:border-b border-border py-4 font-geist text-[10px] font-bold uppercase tracking-wider text-iron-slate/80"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Side */}
              <div className="w-full md:w-[45%]  h-[200px] md:h-auto rounded-lg relative overflow-hidden border border-border bg-[#080808]">
                <img
                  src={step.image}
                  alt={`Step ${step.index} — ${step.label}`}
                  
                  className="object-contain object-center"
                />
                <div className="absolute   bg-bg opacity-20 pointer-events-none" />
              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  );
}
