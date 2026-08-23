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

## Create & schedule posts
- **Draft with AI** — describe your post in a line; AI writes the tweet (editable before you schedule), using the same OpenAI setup as replies. Add an optional **link** (auto-unfurled) and **image**.
- **Schedule by day** — pick a day; Ghostly247 posts it through your own X session that day, the next time your browser is open and signed in. If the browser is closed all day, it goes out the next time you open the extension after that day.
- **Account type (Free / Pro)** — a toggle sets the post length. Free caps at 280 characters (default, since most accounts are free). Pro (X Premium) unlocks long-form and adds a **Short (≈280) / Medium (≈1,000) / Long (≈4,000)** length picker. The character counter, the AI draft length, and scheduling all follow the selected limit, and the count includes an attached link (23 chars, the way X counts it). On Free, drafts are hard-guaranteed to fit 280 (server retries then trims).
- **Up to 5 scheduled** at a time. Posts publish even while the engine is paused; delete any scheduled post to cancel it. Live status (Scheduled → Posting → Posted / Failed) in the popup's **Schedule** tab.

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
- **Daily recap email** — a branded end-of-day summary of everything Ghostly did that day: per-action counts, the **full text of every AI reply & quote** (so you can review they sound like you), and your new follows. Timed to your local morning, sent at most once a day, with one-click unsubscribe.
- **Diagnostics** — recent selector/network issues and auto-pause notices.
- **Plan panel** — current plan, monthly usage, upgrade.

## Plans & billing
- **Free** — 50 actions per month (likes + replies + follows + bookmarks + reposts + quotes combined), resets monthly.
- **Pro** — unlimited actions, billed **$12.99/month** or **$3.99/week** (pick either at checkout). Stripe checkout + self-serve billing portal; subscriptions stay in sync via webhooks.

## Support & misc
- **Contact Support** — opens a pre-addressed email to `support@ghostly247.com`.
- **Crash-safe popup** — an error boundary recovers the UI instead of going blank.
- **Settings persistence** — your config is saved locally; relevance keywords sync to your account across devices.
- **Timezone-aware** scheduling and daily resets.
