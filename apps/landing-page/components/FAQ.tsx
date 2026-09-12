import React from 'react';
import { FadeInStagger } from "./animations/FadeInStagger";

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "Will I get banned from Twitter / X?",
    a: "No system can guarantee zero risk on a platform we don\u2019t own. But Ghostly247 runs in your real browser session with random 8\u201345s delays between actions, age-aware daily caps, and an auto-pause built in. It\u2019s the safest engagement pattern available \u2014 and far safer than tools that log into your account from cloud servers.",
  },
  {
    q: "Do you have access to my passwords?",
    a: "Never. Ghostly247 is a browser extension. It acts in your already-logged-in browser session \u2014 like you\u2019re sitting at the keyboard. Your credentials stay between you and X. We never see them, store them, or transmit them.",
  },
  {
    q: "How do the AI replies work?",
    a: "Pick a tone \u2014 friendly, professional, or witty. Ghostly247 reads the full post and drafts a short, relevant reply in that tone using gpt-4o-mini, then runs it through OpenAI moderation before it ever posts. It never replies to the same post twice.",
  },
  {
    q: "What can it actually do?",
    a: "On Twitter / X: auto-like, AI replies, follow, bookmark, repost, and quote-tweet \u2014 all inline in one tab. It can visit creators you target and like their posts, follow their followers, and automatically follow back anyone who follows you. Relevance and exclude keywords keep it on-topic.",
  },
  {
    q: "Do I need to keep my browser open?",
    a: "Yes \u2014 and that\u2019s the whole safety pitch. Ghostly247 runs in your browser, on your schedule. We don\u2019t run on cloud servers logged into your account (which is exactly how other tools get users banned). When your laptop is closed, Ghostly247 sleeps too.",
  },
  {
    q: "What does the free plan include?",
    a: "Every feature is unlocked on the free plan \u2014 nothing is crippled. The only limit is 50 actions per month (likes, replies, follows and the rest combined), which resets each month. Pro removes the cap for $7.99/month (or $2.99/week), and you can cancel any time in one click.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "Everything is wiped \u2014 action logs, settings, drafts, billing records (per regulation we keep tax-required records for 7 years, anonymized). No soft-deletes. No \u2018we may retain your data for legitimate business interests.\u2019 Gone.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-bg font-sans py-16 md:py-24 px-3 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[1400px] grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-10 sm:gap-16 md:gap-12 lg:gap-20">
        
        {/* Left Column */}
        <FadeInStagger y={30} stagger={0.1} className="flex flex-col items-start">
          <span className="inline-flex rounded-sm bg-card border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-6">
            FAQ
          </span>
          <h2 className="text-[28px] sm:text-[36px] md:text-[42px] font-medium leading-[1.1] text-fg mb-8 sm:mb-10 tracking-tight">
            Have questions?<br />
            Check out the<br />
            FAQs
          </h2>
          
          <div className="bg-card rounded-xl p-2 flex items-center gap-4 w-full max-w-[300px] border border-border">
            <div className="relative h-[100px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
              <img 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop" 
                alt="Clarissa" 
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col flex-1 pt-1 pb-1 pr-2">
              <span className="text-fg font-medium text-[15px]">Talk with Team</span>
              <span className="text-[#666666] text-[9px] uppercase tracking-widest font-semibold mt-1 mb-3">Founder of Ghostly247</span>
              <button className="bg-white/0 group border border-white/70 hover:text-black hover:bg-gray-100 transition-colors text-fg text-[13px] font-medium px-0 py-2 rounded-full flex items-center justify-center w-full group">
                Book 15-mins call
                <svg className="w-3.5 h-3.5 ml-1 text-fg group-hover:text-black transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </FadeInStagger>

        {/* Right Column */}
        <FadeInStagger y={40} stagger={0.1} className="flex flex-col space-y-2.5">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl bg-card border border-border transition-colors hover:bg-[#151515]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 focus:outline-none">
                <span className="text-[14.5px] font-medium text-fg transition group-hover:text-fg">
                  {item.q}
                </span>
                <span className="flex-none text-muted-fg transition group-open:rotate-45 ml-4">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 font-light"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M12 5v14m-7-7h14"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <p className="text-[14px] leading-relaxed text-muted-fg">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </FadeInStagger>
        
      </div>
    </section>
  );
}
