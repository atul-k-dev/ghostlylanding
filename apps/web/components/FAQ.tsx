import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { ClawScratch } from "./stickers/ClawScratch";
import { Handprint } from "./stickers/Handprint";
import { TextSticker } from "./stickers/TextSticker";

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "Will I get banned from Twitter or LinkedIn?",
    a: "No system can guarantee zero risk on platforms we don't own. But Casper runs in your real browser session with random 8-45s delays between actions, age-aware daily caps, and an auto-pause the moment a platform returns anything weird. It's the safest engagement pattern available — and far safer than tools that log into your accounts from cloud servers.",
  },
  {
    q: "Do you have access to my passwords?",
    a: "Never. Casper is a browser extension. It acts in your already-logged-in browser session — like you're sitting at the keyboard. Your credentials stay between you and the platforms. We never see them, store them, or transmit them.",
  },
  {
    q: "How does voice training work?",
    a: "Paste 10 of your past comments into Casper. We use gpt-4o-mini to extract a tone profile — vocab, length, sentence structure, your signature moves. Every comment Casper drafts is evaluated against that profile before it reaches your approval queue.",
  },
  {
    q: "Do I need to keep my browser open?",
    a: "Yes — and that's the whole safety pitch. Casper runs in your browser, on your schedule. We don't run on cloud servers logged into your accounts (which is exactly how other tools get users banned). When your laptop is closed, Casper sleeps too.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. One click in your billing settings, no email-the-CEO retention games. Your free tier stays yours forever even after you cancel Pro.",
  },
  {
    q: "How is this different from PowerIn or Linkmate?",
    a: "Those are sales-team tools wearing creator clothes. They run on cloud infrastructure (which platforms detect), they're LinkedIn-only, and the dashboards look like Salesforce. Casper is built for one person, both platforms, in your own browser, with cute branding instead of cold templates.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "Everything is wiped — tone profile, action logs, settings, billing records (per regulation we keep tax-required records for 7 years, anonymized). No soft-deletes. No 'we may retain your data for legitimate business interests.' Gone.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-ink py-24 md:py-32"
    >
      <BloodDrip
        className="pointer-events-none absolute right-[10%] top-16 h-9 w-auto opacity-60"
        rotate={15}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[6%] bottom-32 h-6 w-auto opacity-40"
        rotate={-170}
      />

      {/* Bats */}
      <div
        className="pointer-events-none absolute left-[14%] top-[10%] text-cream/40 animate-fly"
        style={{ animationDelay: "0.5s" }}
      >
        <Bat className="h-12 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[16%] bottom-[14%] text-cream/30 animate-fly"
        style={{ animationDelay: "2.4s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>

      {/* Stickers */}
      <Handprint
        className="pointer-events-none absolute -right-4 top-[12%] hidden h-24 w-auto opacity-75 lg:block"
        rotate={24}
      />
      <ClawScratch
        className="pointer-events-none absolute -left-6 bottom-[18%] hidden h-20 w-auto opacity-60 lg:block"
        rotate={-160}
      />
      <TextSticker
        text="ASK AWAY!"
        size="md"
        tilt={-7}
        className="absolute left-[4%] top-[14%] hidden lg:block"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-10">
        <div className="text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            FAQ
          </span>
          <h2 className="font-display text-3xl leading-[1] tracking-tight text-cream sm:text-4xl md:text-5xl">
            Questions creators
            <br />
            actually <span className="text-coral">ask.</span>
          </h2>
        </div>

        <div className="mt-14 divide-y divide-cream/10 rounded-3xl border border-cream/10 bg-ink-soft/70">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group px-6 py-5 transition md:px-8 md:py-6"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left">
                <span className="font-display text-base leading-snug tracking-tight text-cream md:text-lg">
                  {item.q}
                </span>
                <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-cream/20 text-coral transition group-open:rotate-45 group-open:bg-coral group-open:text-cream">
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 1.5 V 10.5 M 1.5 6 H 10.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/70 md:text-[15px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
