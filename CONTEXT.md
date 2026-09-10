# Casper AI — Build Plan

This is the source-of-truth document for building Casper AI. Read it fully at the start of every session. Don't deviate from it without flagging.

---

## 1. What is Casper AI

A friendly browser extension that grows solo creators' Twitter (X) and LinkedIn presence on autopilot. It likes, comments, and follows on the user's behalf — in their tone, on their schedule — using AI to keep every action human-feeling and platform-safe.

Mascot: a cute ghost. Brand voice: warm, playful, never bro-y or aggressive sales-tool energy.

---

## 2. Who it's for

**Primary user:** Solo creators and influencers building a personal brand on Twitter and/or LinkedIn. Think: indie hackers, freelance designers, fitness coaches, writers, founders. People who can't afford to hire a social media manager but lose 2-4 hours a day on engagement.

**Not the target:** sales teams, agencies running 50+ accounts, B2B outbound SDRs. Those are PowerIn / Linkmate / PhantomBuster's market. We don't compete there.

---

## 3. The wedge

Most automation tools in this space are built for sales teams and look like enterprise B2B software. Casper is built for one person growing one (or two) accounts, and it feels like a friendly tool — not a growth-hack weapon. Cute branding is a deliberate moat against the existing crop of cold, generic competitors.

**Day-one differentiator:** Twitter + LinkedIn under one license. Most competitors are LinkedIn-only.

---

## 4. The moat (long-term)

- **Personal Voice Training** — paste 10 of your past comments, Casper learns your tone. Compounds the longer the user uses it.
- **Niche templates** — Designer, Founder, Coach, Writer presets so setup takes 7 minutes, not 70. **Never built.** Superseded by the setup flow in `updateplan.md` Phase 1.4, which reads the user's own X profile instead of asking them to pick a preset.
- **Trust** — zero bans, transparent action logs. Solo creators are paranoid about losing accounts they spent years building. We win by being the safest option, not the most aggressive.

---

## 5. Features (full list — phasing in §11)

1. **Smart Auto-Liking** — like by hashtag/keyword, like all posts from chosen creators, fresh-posts-only filter, daily caps with random variance, junk-post skip.
2. **AI-Powered Comments** — tone presets + custom voice training, context-aware generation (reads the full post first), length control, approval queue OR auto-post mode, dedupe per account, profanity/risk filter.
3. **Smart Follow & Connect** — follow engagers of target creators, whitelist, daily caps. *(Never built: follow-by-bio-keyword and auto-unfollow — both land in `updateplan.md` Phase 6.5. LinkedIn connection notes are moot; LinkedIn automation was removed.)*
4. **Smart Scheduling** — active hours, time zone aware, one-tap pause. *(Active hours existed as dead code until `updateplan.md` Phase 0.4 wired them into the tick. Burst mode was never built and is currently unscheduled.)*
5. **Safety Engine** — random delays per action, age-aware quotas, browser-session execution (no headless servers), auto-pause on platform anomalies, per-platform rule sets.

---

## 6. AI model choices

> Updated 2026-09-10 to match the code. This section previously specified
> `gpt-4o-mini` everywhere; the implementation moved to the 5.x models some time
> ago and the doc had not caught up. What follows is what the code actually does.

- **Reply generation (live, per-post):** `gpt-5.4-mini` at `temperature: 0.9`.
  Fast and cheap, and a real step up from `gpt-4o-mini` on short replies. The
  high temperature is deliberate: repetition across a feed of replies is what
  reads as a bot. See `server/src/openai/generate-comment.ts`.
- **Post drafting + batch ideas:** `gpt-5.5`, `reasoning_effort: 'low'`. This is
  writing the user publishes under their own name, so it gets the strongest
  model. See `generate-post.ts`, `generate-ideas.ts`.
- **Voice training (one-time, batch):** `gpt-5.5`, JSON mode. Runs once per
  training request, and its quality compounds across every future reply — the one
  place clearly worth a frontier model. See `train-voice.ts`.
- **Risk/profanity filtering:** OpenAI moderation endpoint (free) before any auto-post.
- **Post-relevance scoring:** not a model call. Relevance is whole-word keyword
  matching in `platforms/common/relevance.ts` — no tokens spent per post.

**5.x API notes** (these have bitten us before, they're not optional):
- `max_tokens` is rejected — use `max_completion_tokens`.
- `gpt-5.5` allows only the default temperature; don't send one.
- 5.x spends part of the completion budget on internal reasoning, so token
  ceilings must comfortably exceed visible output or a reasoning spike returns
  empty content.

If unsure which model to use for a new feature, ask. Default = `gpt-5.4-mini`;
reach for `gpt-5.5` when the output is published under the user's name.

---

## 7. Stack & repo

- **Monorepo, pnpm workspaces.**
- `apps/extension` — MV3 Chrome extension. React + Tailwind + TypeScript.
- `apps/server` — Express + WebSocket gateway. TypeScript. Mongoose for MongoDB.
- `apps/landing-page` — Next.js marketing site only. Single CTA: Add to Chrome. Zero auth, zero billing.
- `apps/admin` — internal-only admin panel (Phase 4).
- `packages/shared` — shared types (User, Subscription, ActionLog, CommentDraft, NicheTemplate, etc.).

**Stack rules:**

- TypeScript everywhere. No plain JS files.
- Strict mode on. No `any` without a justifying comment.
- Tailwind utility-first; no custom CSS files unless absolutely necessary.
- MongoDB via Mongoose. Schemas live in `apps/server/src/models/`.
- Auth: email + magic link via Resend. JWT for session.
- Billing: Stripe.
- Email: Resend (transactional + waitlist + post-action summaries).

The **admin panel is internal-only** — not for businesses or end customers. Email-allowlist + role check on the backend.

Shared types live in `packages/shared`. Anything used by 2+ apps goes there (User, Subscription, ActionLog, CommentDraft, NicheTemplate, etc.).

Use `pnpm` workspaces unless I say otherwise.

---

## 8. Pricing

Free tier as the acquisition funnel. Single paid tier (Pro), three billing cycles.

| Tier     | Price       | Billing     | Notes                                                                      |
| -------- | ----------- | ----------- | -------------------------------------------------------------------------- |
| **Free** | $0          | forever     | 25 actions/day cap, 1 platform only, no AI comments (likes + follows only) |
| **Pro**  | **$14.99**  | per month   | Full product, both platforms, all features unlocked                        |
| **Pro**  | **$37.99**  | per quarter | ~16% off vs monthly                                                        |
| **Pro**  | **$149.99** | per year    | ~17% off vs monthly                                                        |

**Stripe setup:** one product (`Casper Pro`) with three recurring prices (monthly, quarterly, annual). All Pro plans get the same feature set — only the discount changes across cycles.

The Free tier is a feature gate, not a separate Stripe product.

---

## 9. Architecture (high level)

1. Extension runs in the **user's own browser session** — no headless servers, no shared infra. This is a deliberate safety/anti-detection choice.
2. Content scripts inject into Twitter (`x.com`, `twitter.com`) and LinkedIn (`linkedin.com`) — DOM-driven actions for likes, comments, follows.
3. Background service worker holds the **scheduling engine**: action queue, daily caps, random delays, burst mode timing.
4. When a comment is needed, the extension sends `{ post_text, tone_profile_id, length_pref }` to the backend over HTTPS.
5. Backend calls `gpt-4o-mini` with a templated prompt (post + tone), runs OpenAI moderation, returns the comment.
6. Extension either auto-posts (if user is in auto-post mode) or queues for one-tap approval.
7. Every action is logged to MongoDB (action type, platform, target post URL, success/failure, timestamp).
8. Daily summary email via Resend at 9pm user time (opt-in).

---

## 10. Safety & privacy (non-negotiable)

These are product principles. Bake them into the code, not just the marketing.

- **Browser-session only:** Casper acts as the user, in the user's browser, using the user's real session. No credential collection, no headless automation, no cloud-side LinkedIn/Twitter logins. This is the single most important safety choice.
- **Random delays on every action:** 8–45 seconds, randomized. Never two actions in the same second.
  > ⚠️ **NOT TRUE OF THE CODE YET (as of 2026-09-10).** The engine currently
  > paces in-session actions at 3–7s (`executor.ts` hands
  > `minDelayMs: 3_000, maxDelayMs: 7_000` to the content script). The correct
  > 8–45s value exists in `timegate.ts` but only gates scheduler *ticks*.
  > `updateplan.md` **Phase 0.1** makes this claim true. Until it ships, do not
  > re-publish `docs/Ghostly247-Five-Features.pdf`, which repeats it.
- **Daily caps that scale with account age:** new accounts get conservative caps (e.g. 30 likes/day), older accounts ramp up. Never exceed safe thresholds.
- **Auto-pause on anomaly:** if the platform returns rate-limit errors, soft-blocks, or any unexpected response, halt for 3 hours and notify the user.
- **One-tap kill switch:** user can stop all activity instantly from the extension popup.
- **Action transparency:** every like, comment, and follow is logged and visible to the user. No silent activity.
- **No comment data hoarding:** post text sent to the backend for comment generation is processed in-memory and not stored beyond the request lifecycle.
- **User-owned deletion:** account-delete endpoint must wipe all derived data (tone profile, action logs, settings) — not soft-delete.

If a feature plan conflicts with these, flag it and stop.

---

## 11. Build phasing — MVP FIRST, then layer

> **SUPERSEDED as of 2026-09-10.** The MVP below shipped. Current work follows
> **`updateplan.md`** at the repo root, which holds the phase order, the step
> checklists, the tests, and the progress log. Read that file for what to build
> next; the phases below are kept only as a record of how the product got here.

Do not build everything at once. Phase order is locked.

### Phase 1 — MVP (build this first, end-to-end)

The smallest thing that proves the wedge — both platforms, all three actions:

- **Extension shell** — MV3, content scripts injected into Twitter and LinkedIn pages.
- **Floating control popup** — user opens from extension icon, sees current status, daily counts, pause button.
- **Auto-Like engine** — keyword/hashtag targeting, account-list targeting, fresh-post filter, daily cap with variance.
- **AI Comment engine** — tone presets only (no custom voice training yet), context-aware via `gpt-4o-mini`, approval queue mode (no auto-post in MVP — safer for v1), per-account dedupe.
- **Auto-Follow engine** — follow by bio keyword, follow engagers of target creators, daily cap, basic whitelist.
- **Scheduling engine** — active hours + time zone, daily caps, random delays, one-tap pause.
- **Safety Engine** — baked into all action engines from day one. Random delays, age-aware quotas, browser-session execution, auto-pause on anomalies.
- **Backend** — Express + REST API for comment generation, basic auth (email + magic link via Resend), MongoDB user model, action logging.
- **Landing page** — Next.js, single page: hero + features + pricing + waitlist signup. Resend for waitlist confirmation email.

Don't bother with Stripe, voice training, burst mode, daily summary emails, admin panel, or anything else until Phase 1 demos cleanly.

### Phase 2 — Monetization & Retention

- Stripe subscriptions with the 3 billing cycles from §8.
- Free-tier feature gating (25 actions/day, 1 platform, likes+follows only).
- **Auto-post mode** for AI Comments (currently approval-only in MVP).
- **Burst Mode** in scheduling.
- Daily summary email via Resend.

### Phase 3 — The Moat (power features)

- **Personal Voice Training** — paste 10 past comments, `gpt-4o-mini` extracts tone profile.
- **Smart targeting** — follow engagers of multiple target creators (compound targeting).

### Phase 4 — Scale

- Admin panel (internal only).
- Annual billing improvements, lifetime deals, affiliate program.
- Public API for power users.
- Team/agency tier (separate Stripe product).

---

## 12. Coding conventions & defaults

- **TypeScript everywhere.** No plain JS files.
- **Strict mode on** in `tsconfig.json`. No `any` unless explicitly justified in a comment.
- **Tailwind classes** — utility-first, no custom CSS files unless absolutely necessary.
- **Async/await** — no `.then()` chains.
- **Folder naming:** `kebab-case` for folders, `PascalCase` for React components, `camelCase` for everything else.
- **Env vars** — use `.env.example` in every app folder; never commit real keys; use `dotenv` server-side.
- **No `console.log` in committed code** — use a logger (pino) on the backend.
- **Mongoose schemas** live in `apps/server/src/models/`. Shared types live in `packages/shared/`.
- **API responses** — always `{ ok: boolean, data?, error? }` shape.
- **Extension messaging** — always `{ type: string, payload: any, id?: string }`. Type-narrow on `type`.
- **Errors** — never swallow. Either bubble up or log+rethrow with context.
- **Action log entries** — every like/comment/follow writes a typed `ActionLog` entry. Never bypass the logger.

---

## 13. What to do at the start of every session

When I say _"go through the md file"_ (or you're starting fresh):

1. Read this file fully.
2. Confirm in one short message what we're working on **and which phase** the next task belongs to.
3. If the task I give doesn't fit the current phase, **say so** and propose either deferring it or moving to that phase. Don't silently jump phases.
4. Do not regenerate parts of the product that already exist — check the repo first.
5. When picking an OpenAI model for a new feature, refer to §6 — default = `gpt-4o-mini`. Ask if unsure.
6. When in doubt about safety (delays, caps, browser session), refer to §10 and prefer the more conservative option.

---

## 14. Quick reference

> Corrected 2026-09-10. This section still described the pre-launch plan
> ("Casper AI", LinkedIn day one, `gpt-4o-mini`), none of which matches the
> shipped product.

- **Product name:** Ghostly247 *(the npm workspace is still `casper-*` and the
  storage keys are still `casper.*` — internal names, deliberately left alone).*
- **Tagline:** The friendly little ghost that grows your Twitter/X while you sleep.
- **Wedge:** Browser extension, runs in the user's own signed-in session, built
  for solo creators (not sales teams).
- **Platforms:** Twitter/X only. **LinkedIn automation was removed** — the types
  remain in `packages/shared` so the platform maps stay total, but nothing drives it.
- **Moat:** Personal Voice Training + cute brand + transparent safety (compounds
  over time, hard for B2B-feeling competitors to copy).
- **Pricing:** Free + Pro, weekly and monthly via Stripe.
- **AI:** `gpt-5.4-mini` for replies, `gpt-5.5` for posts, ideas and voice
  training. OpenAI moderation for safety. See §6.
- **Current state:** MVP shipped. The engagement half is fully autonomous; the
  publishing half is still manual. Closing that gap is `updateplan.md` Phase 3.
- **Next work:** always `updateplan.md`, in phase order.

---
