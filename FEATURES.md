# Ghostly247 — Features

The friendly little ghost that grows your **Twitter / X** presence while you sleep.
A browser extension that likes, replies, follows, bookmarks, reposts & quotes on your behalf — in your tone, on your schedule, safely.

---

## Accounts & Auth
- **Sign up** — name, email, password.
- **Log in** — email + password.
- **Continue with Google** — one-click OAuth sign-in / sign-up.
- **Forgot password** — emailed 6-digit reset code (expires in 15 min); resets and auto-signs you in.
  - Reset flow **survives the popup closing** — reopen and it resumes at the code-entry step.
- **Show/hide password** toggle.
- **Sign out.**
- **Delete account** — hard-wipes everything (profile, action logs, drafts, local settings).
- **Account suspension** — banned accounts are blocked server-side on every request.

## Engagement actions (auto, in your feed)
The **home-feed autopilot** opens one tab, smoothly scrolls your timeline, and acts in place:
- **Auto-Like** matching posts.
- **Auto-Reply** — AI-generated, tone-matched replies (see below).
- **Auto-Follow** the author of matching posts.
- **Bookmark** matching posts (private save-for-later).
- **Repost / Retweet** matching posts.
- **Quote-tweet** matching posts with a short AI commentary.

## Targeting & discovery
- **Target creators** — add handles; Ghostly visits their profile, likes fresh posts, and scans their followers to follow.
- **Auto follow-back** — periodically follows back people who follow you (whitelist-aware).
- **Relevance keywords** — only engage posts containing these words (blank = everything).
- **Exclude keywords (blocklist)** — skip any post containing these, even if it matches above.
- **Whitelist** — accounts Ghostly will never follow.

## AI replies
- **AI reply & quote generation** via the backend (`gpt-4o-mini`).
- **Tone presets** — friendly, professional, witty.
- **Safety moderation** — OpenAI moderation on both the source post and the generated text (fail-closed).
- **Per-post dedupe** — never drafts/replies to the same post twice.

## Scheduling & safety
- **One-tap kill switch** — the Active / Paused pill stops everything within ~2 seconds.
- **Session length** — runs for 15 / 30 / 45 / 60 min, then auto-pauses to protect your account.
- **Random human-like delays** between actions (no two in the same second).
- **Daily caps** per action type, **age-aware** (newer accounts get safer limits) with ±15% daily variance.
- **Fresh-posts-only** filter (skips anything older than ~48h).
- **Browser-session execution** — acts as you, in your own browser; no headless servers, no credential collection.
- **Watch-it-work mode** — foreground tabs so you can see every action (or run quietly in the background).
- **Auto-pause on anomalies** + a **Diagnostics** log of issues.

## Dashboard & transparency
- **Live daily counters** — Likes, Comments, Follows, Bookmarks, Reposts, Quotes.
- **Activity log** — every action with status (✓/✗), target, and timestamp.
- **Diagnostics** — recent selector/network issues and auto-pause notices.
- **Plan panel** — current plan, monthly usage, upgrade.

## Plans & billing
- **Free** — 5 actions per month (likes + replies + follows + bookmarks + reposts + quotes combined), resets monthly.
- **Pro** — $9.99/month, unlimited actions. Stripe checkout + self-serve billing portal; subscriptions stay in sync via webhooks.

## Support & misc
- **Contact Support** — opens a pre-addressed email to `support@ghostly247.com`.
- **Crash-safe popup** — an error boundary recovers the UI instead of going blank.
- **Settings persistence** — your config is saved locally; relevance keywords sync to your account across devices.
- **Timezone-aware** scheduling and daily resets.
