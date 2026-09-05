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
- **Schedule by day and time** — pick the day *and* the hour; Ghostly247 posts it through your own X session at that moment, the next time your browser is open and signed in. If the browser is closed then, it goes out as soon as you open the extension afterwards.
- **Account type (Free / Pro)** — a toggle sets the post length. Free caps at 280 characters (default, since most accounts are free). Pro (X Premium) unlocks long-form and adds a **Short (≈280) / Medium (≈1,000) / Long (≈4,000)** length picker. The character counter, the AI draft length, and scheduling all follow the selected limit, and the count includes an attached link (23 chars, the way X counts it). On Free, drafts are hard-guaranteed to fit 280 (server retries then trims).
- **Threads** — add follow-up tweets under the main one and Ghostly posts them as a single thread. If any part of the thread fails to build, nothing is posted at all: a truncated thread can't be undone on a public timeline.
- **Suggest posts** — one tap drafts three ideas in your trained voice, informed by which of your own posts actually performed (from the growth scan). They land in the composer as suggestions; nothing is scheduled until you say so.
- **Up to 25 scheduled** at a time. Posts publish even while the engine is paused; delete any scheduled post to cancel it. Live status (Scheduled → Posting → Posted / Failed) in the popup's **Schedule** tab.

## Targeting & discovery
- **Topic feeds (live search)** — save up to 5 searches and Ghostly works X's **Latest** tab for each one: real posts on your subject, newest first, instead of whatever the home feed decides to show you. X's own search operators work (`min_faves:5`, `-filter:replies`), and each feed has a **Run now** button.
- **Early replies** — with it on, Ghostly re-checks one target creator every few minutes and engages only posts from the last ~3 hours, so your reply lands while the thread is still short. Off, creators are swept every 6 hours. Both schedules run independently.
- **Whole-word keyword matching** — "ai" no longer fires on "said", "chair", "email" or "openai", while "indie hacker" still matches "indie hackers". Applies to the blocklist too.
- **Quality filters** — never engages your own posts, skips posts buried as replies in someone else's thread (toggleable), and won't generate a reply to a post too short to have anything to reply to.
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

## Your voice
- **Voice training** — one tap in Settings and Ghostly reads your last ~50 posts off your own profile, works out how you actually write (sentence length, lowercase habits, punctuation, emoji, how you open and close a thought), and writes every reply, quote and drafted post that way. It **overrides** the tone preset rather than blending with it.
- **Privacy** — the posts are analysed and thrown away. Only the short style summary is stored, and you can read it in Settings or delete it at any time.
- **Retrain** whenever your writing shifts.

## Review before posting
- **Reply approval queue** — with it on, a generated reply never posts straight away. It waits in the **Review** tab beside the post it answers, so you can judge it in context.
- **Edit in place** — fix a word before approving; your version is what goes out.
- **Approve or skip** — approving posts it through the normal path (same caps, same logging). Skipping drops it, and Ghostly won't reply to that post again.
- **Nothing is lost** — the queue holds 30 and, when full, Ghostly *stops drafting* rather than quietly discarding drafts you never saw.
- **Defaults on for new installs**, off for anyone already running (your replies don't stop going out because of an update). Toggle it in Settings.

## Growth scoreboard
Everything else Ghostly records is what it **did**. This is what it **got**.
- **Daily profile reading** — once a day Ghostly opens your own profile in a background tab and notes your follower and following counts. No clicks, no actions: it only looks, so it costs nothing against your daily caps or your monthly allowance.
- **Follower trend** — a sparkline of every reading, plus change over 1 / 7 / 30 days. Each figure is labelled with the span it actually covers ("+21 over 2d"), so a three-day-old install never implies a month of history.
- **Reply performance** — Ghostly re-reads your own Posts & replies timeline and records how each reply did (likes, replies, reposts, views). Numbers keep maturing on later readings, and your best-performing replies are listed with a link to each one.
- **Follow-back payoff** — of your most recent followers, how many are accounts Ghostly followed first.
- **Growth tab** in the popup, with **Refresh now** — works even while the engine is paused, since reading your own profile isn't automation.
- **In the daily recap email** — the follower line rides along with the action counts, but only once there are two readings to compare.

## Reliability
- **Remotely-updatable selectors** — X changes its DOM every few weeks, and when it does the buttons Ghostly clicks stop existing. The extension now pulls its selector map from the server (on every browser start, then every 6 hours), so a fix reaches every user in minutes instead of waiting days for a Chrome Web Store review. The bundled map is the fallback and the floor: a remote config can only correct keys that already exist, every value is validated as real CSS before use, and anything invalid is ignored rather than applied.
- **Diagnostics telemetry** — the selector misses, tab timeouts and auto-pauses the extension already recorded locally are now reported centrally, on their own schedule (a fully broken install produces no activity to piggyback on). Your local Diagnostics panel keeps its full history either way.
- **Fleet health (admin)** — issues ranked by volume with the count of *distinct affected users*, compared against the previous window, so one stuck browser reads differently from an outage. A `selector_miss` climbing across many users is flagged as a probable X DOM change.
- **Break-glass fix** — an admin can push a corrected selector straight to every user without a deploy.

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
