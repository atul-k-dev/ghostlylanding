import type { Metadata } from "next";
import { A, Callout, DocShell, H2, H3, OL, P, UL } from "@/components/page-kit";
import {
  FREE_MONTHLY_ACTIONS,
  MAX_SCHEDULED_POSTS,
  MAX_TOPIC_FEEDS,
  PACES,
  REPLY_QUEUE_MAX,
  WARMUP_DAYS,
  WARMUP_FLOOR_PCT,
} from "@/lib/limits";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help & docs",
  description:
    "Set up Ghostly247, choose a pace, train your voice, and understand what counts as an action — with the real limits the extension enforces.",
  alternates: { canonical: "/docs" },
};

const balanced = PACES[1];

export default function DocsPage() {
  return (
    <DocShell
      eyebrow="Support"
      title="Help & docs"
      intro={
        <>
          Everything you need to get Ghostly247 running, and the honest version
          of what it does once it is.
        </>
      }
    >
      <H2>Getting started</H2>
      <OL>
        <li>
          <strong>Install the extension</strong> from the Chrome Web Store and
          pin it, so the side panel is one click away.
        </li>
        <li>
          <strong>Sign in to X</strong> in the same browser, in a normal tab.
          Ghostly247 works inside that session — it never asks for your X
          password and never signs in from a server.
        </li>
        <li>
          <strong>Create a Ghostly247 account</strong> with email or Google.
          This is what carries your settings between devices.
        </li>
        <li>
          <strong>Run onboarding.</strong> It asks how old the account is, what
          you post about, and how fast you want to go, then writes a matching
          set of limits.
        </li>
        <li>
          <strong>Turn it on.</strong> The side panel shows what it is doing,
          action by action, as it happens.
        </li>
      </OL>

      <Callout title="Chrome has to be open">
        Everything runs in your browser, which is what makes it safer than a
        cloud tool — and also means it only works while Chrome is running. A
        post scheduled for a moment when your browser is closed goes out the
        next time you open it.
      </Callout>

      <H2>Choosing a pace</H2>
      <P>
        A pace moves every safety number together, so you never end up with a
        combination nobody designed. There are three, and the daily caps below
        are identical on Free and Pro.
      </P>
      <UL>
        {PACES.map((p) => (
          <li key={p.id}>
            <strong>{p.label}</strong> — {p.blurb} Up to {p.caps.likes} likes,{" "}
            {p.caps.replies} replies and {p.caps.follows} follows a day, capped
            at {p.hourly} actions an hour.
          </li>
        ))}
      </UL>
      <P>
        Those are ceilings, not targets. A new automation starts at{" "}
        {WARMUP_FLOOR_PCT}% of them and warms up over {WARMUP_DAYS} days, a
        younger X account gets a lower multiplier on top, and each day varies by
        about ±15% so the pattern never looks mechanical. There is never less
        than 8 seconds between two actions, on any pace.
      </P>

      <H2>What counts as an action</H2>
      <P>
        A like, reply, follow, bookmark, repost or quote — one each. Reading
        your own profile for the growth scoreboard does not count, and neither
        does drafting a post you never schedule. The free plan includes{" "}
        {FREE_MONTHLY_ACTIONS} a month, reset on the 1st. See{" "}
        <A href="/#pricing">pricing</A> for the full comparison.
      </P>

      <H2>Training your voice</H2>
      <P>
        Ghostly247 reads roughly your last 50 posts and learns how you actually
        write, then writes every reply that way. The voice profile overrides the
        tone presets rather than averaging with them. Your posts are analysed in
        memory and discarded — only a short style summary is kept, and you can
        read or delete it in Settings at any time.
      </P>

      <H2>Reviewing before anything posts</H2>
      <P>
        Turn on the review queue and replies wait for you instead of going out.
        Up to {REPLY_QUEUE_MAX} can be held at once, each shown next to the post
        it answers, so you approve or discard it in context. Quotes and reposts
        are off by default on every pace, because they publish under your own
        name.
      </P>

      <H2>Creating and scheduling posts</H2>
      <P>
        Write your own or have Ghostly247 draft them, then queue them ahead. You
        can hold up to {MAX_SCHEDULED_POSTS} scheduled posts at a time, and on{" "}
        {balanced.label} it will write up to {balanced.postsPerDay} a day for
        you if auto-drafting is on.
      </P>

      <H2>Targeting</H2>
      <P>
        Up to {MAX_TOPIC_FEEDS} topic feeds decide where it looks for people
        worth replying to, on top of your home timeline. Topic feeds draw from a
        smaller budget of their own, so they never eat the whole day&rsquo;s
        allowance. Nothing older than about 48 hours is touched — you are never
        the person replying to a week-old thread.
      </P>

      <H2>Stopping it</H2>
      <UL>
        <li>
          <strong>Instantly</strong> — one tap on pause stops everything
          mid-action, in about a second.
        </li>
        <li>
          <strong>On its own</strong> — sessions run for a set length and then
          pause for a break.
        </li>
        <li>
          <strong>Automatically</strong> — anything unexpected from X and it
          stops by itself, then tells you what it saw in Diagnostics.
        </li>
      </UL>

      <H2>Troubleshooting</H2>

      <H3>Nothing is happening</H3>
      <P>
        Check you are signed in to X in the same browser, that Chrome is open,
        and that you are inside your active hours. If you have used all{" "}
        {FREE_MONTHLY_ACTIONS} free actions this month, it pauses until the 1st
        — the Limits page in Settings shows exactly where you stand.
      </P>

      <H3>It is slower than I expected</H3>
      <P>
        That is usually the warm-up ramp or the account-age multiplier. The
        Limits page marks any action still warming up and shows the full number
        it is heading toward.
      </P>

      <H3>It stopped by itself</H3>
      <P>
        Open Diagnostics. An auto-pause is always logged with what triggered it.
        This is working as intended: it would rather stop early than push
        through something it does not recognise.
      </P>

      <H2>Still stuck?</H2>
      <P>
        Email <A href={`mailto:${SITE.email}`}>{SITE.email}</A> and include what
        you were doing and anything Diagnostics reported. See also the{" "}
        <A href="/#faq">FAQ</A> and the <A href="/status">status page</A>.
      </P>
    </DocShell>
  );
}
