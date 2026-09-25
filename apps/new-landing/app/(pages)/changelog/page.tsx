import type { Metadata } from "next";
import { A, DocShell, P } from "@/components/page-kit";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What shipped in Ghostly247, newest first — new features, fixes, and the safety numbers that changed.",
  alternates: { canonical: "/changelog" },
};

/**
 * Entries are written from work that actually shipped, newest first. Each tag
 * is one of: New (a capability that did not exist), Improved (something that
 * did, made better), Fixed (it was broken).
 *
 * Add a release at the TOP of this array. Keep the summary in the second
 * person, and say what it means for the user rather than what changed in code.
 */
type Tag = "New" | "Improved" | "Fixed";

const RELEASES: {
  date: string;
  title: string;
  items: { tag: Tag; text: string }[];
}[] = [
  {
    date: "2026-09-11",
    title: "The side panel, rebuilt",
    items: [
      {
        tag: "New",
        text: "A completely new side panel: onboarding that sets your safety limits from a couple of questions, a Settings screen that explains every number, and a Limits page showing exactly where you stand this month.",
      },
      {
        tag: "New",
        text: "Ask — tell Ghostly247 what you want changed in plain language. It proposes, you approve, nothing happens until you tap Do it.",
      },
      {
        tag: "New",
        text: "The Growth tab now attributes followers to the actions that earned them, instead of only counting what it did.",
      },
      {
        tag: "Improved",
        text: "Stopping is now instant. One tap on the Active pill halts mid-action rather than finishing the current step first.",
      },
      {
        tag: "Improved",
        text: "Spotlight stays visible while Ghostly247 is reading, not just while it is acting, so you can always see what it is looking at.",
      },
      {
        tag: "Fixed",
        text: "It no longer opens and closes a fresh x.com tab for every task — one marked worker tab now handles the lot.",
      },
      {
        tag: "Fixed",
        text: "Topic feeds work again, and a bug that could like a long run of the home feed in one pass is gone.",
      },
      {
        tag: "Fixed",
        text: "The warm-up ramp was throttling real accounts far harder than intended. It now starts at 40% and reaches full limits in 5 days, and today's corrected cap reaches the UI the same day.",
      },
    ],
  },
];

/**
 * `--brand-050` is lighter than the page ground, so a New pill using it read as
 * floating text next to the tinted Improved/Fixed pills. `--brand-100` is the
 * first step that actually holds its shape here.
 */
const TAG_STYLE: Record<Tag, { bg: string; fg: string }> = {
  New: { bg: "var(--brand-100)", fg: "var(--brand-800)" },
  Improved: { bg: "var(--line-2)", fg: "var(--zinc)" },
  Fixed: { bg: "var(--line-2)", fg: "var(--zinc)" },
};

export default function ChangelogPage() {
  return (
    <DocShell
      eyebrow="Product"
      title="Changelog"
      intro={<>What shipped, newest first.</>}
    >
      <div className="flex flex-col gap-12">
        {RELEASES.map((r) => (
          <section key={r.date} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="t-h5" style={{ color: "var(--ink)" }}>
                {r.title}
              </h2>
              <time
                className="t-sm"
                dateTime={r.date}
                style={{ color: "var(--muted-2)" }}
              >
                {new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
            </div>

            <ul className="flex flex-col gap-3">
              {r.items.map((it, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="t-sm-med mt-[3px] flex-none rounded-full px-2.5 py-0.5"
                    style={{
                      background: TAG_STYLE[it.tag].bg,
                      color: TAG_STYLE[it.tag].fg,
                    }}
                  >
                    {it.tag}
                  </span>
                  <span
                    className="t-body"
                    style={{ color: "var(--zinc)", lineHeight: "1.7em" }}
                  >
                    {it.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div
        className="mt-12 pt-6"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <P>
          Want to be told when something ships? Email{" "}
          <A href={`mailto:${SITE.email}`}>{SITE.email}</A> and we will add you
          to the release note list.
        </P>
      </div>
    </DocShell>
  );
}
