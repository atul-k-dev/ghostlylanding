# Chrome Web Store submission — v3.0.0

Everything needed to fill in the Developer Dashboard for the Ghostly247 listing.
Copy the blocks marked **paste** verbatim; they are written to Google's field
limits and to match what the code actually does.

- **Item ID:** `olfnjmpoacjchlklmdlaimpckblmokga`
- **Dashboard:** https://chrome.google.com/webstore/devconsole
- **Package:** `releases/ghostly247-extension-3.0.0.zip` (969 KB)
- **Backend:** `https://api.ghostly247.com` (verified healthy at build time)

---

## 1. Package facts

| | |
| --- | --- |
| Version | 3.0.0 (previous store release: 2.0.0) |
| Built from | `apps/extension/.env.production` → `VITE_API_BASE_URL=https://api.ghostly247.com` |
| Sourcemaps | Not shipped (production builds omit them) |
| localhost references | None — verified by scanning every `.js` in the zip |
| Permissions | `storage`, `alarms`, `identity`, `sidePanel`, `notifications`, `tabGroups` |
| Host permissions | `https://x.com/*`, `https://twitter.com/*`, `https://api.ghostly247.com/*` |
| Remote code | None |

A **major** bump: the popup is gone, replaced by the side panel and the on-page floating panel, and three permissions are new. Existing users get a visibly different product, which is what a major version is for.

New permissions since 2.0.0: `sidePanel`, `notifications`, `tabGroups`. **A new
permission re-triggers review and Chrome will ask existing users to re-approve,
so expect a slower review than a copy-only update.**

---

## 2. Store listing fields

**Name** (75 max — 39 used) — *paste:*

```
Ghostly247 — Twitter/X Growth Autopilot
```

**Short description** (132 max — 130 used; this is the `description` in the
manifest and is what shows in search results) — *paste:*

```
Twitter/X growth autopilot — auto-like, AI reply, follow, repost & quote, plus AI create & schedule posts and a daily recap email.
```

**Category:** Social & Communication · **Language:** English

---

## 3. Detailed description

*paste:*

```
Ghostly247 is the friendly little ghost that grows your Twitter/X presence while you sleep.

It opens ONE tab in your own browser, reads your timeline, and engages the posts that matter to your audience — liking, replying in your own voice, following, bookmarking, reposting and quoting. It writes and schedules your posts, answers your mentions, then shows you exactly what it did and what it got you.

No headless servers. No password sharing. It acts as you, in your session, at a human pace.


ENGAGEMENT — SIX ACTIONS, ALL OPTIONAL

Turn on only what you want. Each one has its own daily limit.

• AUTO-LIKE — likes posts that match your topics.
• AUTO-REPLY — writes a genuine, relevant reply in your voice and posts it.
• AUTO-FOLLOW — follows the author of a post worth engaging.
• AUTO-BOOKMARK — privately saves matching posts to read later.
• AUTO-REPOST — retweets posts your audience should see.
• AUTO-QUOTE — quote-tweets with a short AI commentary.

Optional "browse like a person" mode opens an author's profile to follow them there, and a post's own page to reply on it, then returns to the feed.


WHO IT ENGAGES — TARGETING

• TOPIC FEEDS (live search) — save up to 5 searches and Ghostly works X's "Latest" tab for each: real posts on your subject, newest first, not whatever the home feed decides to show you. X's own operators work (min_faves:5, -filter:replies). Each has a Run now button, its own action toggles and its own daily budget, so a spent home-feed cap can't starve it.
• TARGET CREATORS — add handles and Ghostly visits their profiles, engages fresh posts, and scans their followers for people worth following.
• EARLY REPLIES — re-checks one target creator every few minutes and engages only posts from the last ~3 hours, so your reply lands while the thread is still short and can still be seen. Off, creators are swept every 6 hours.
• HOME FEED — scrolls your timeline and engages what matches.
• AUTO FOLLOW-BACK — periodically follows back people who followed you.
• RELEVANCE KEYWORDS — only engage posts containing your words.
• BLOCKLIST — skip any post containing these, even if it matched above.
• WHOLE-WORD MATCHING — "ai" no longer fires on "said", "chair" or "email", while "indie hacker" still matches "indie hackers". Applies to the blocklist too.
• WHITELIST — accounts Ghostly will never follow.
• FOLLOW QUALITY FILTER — require (or exclude) words in someone's bio before following them, so you're not following whoever happens to be next in a list.
• QUALITY GUARDS — never engages your own posts, skips posts buried as replies in someone else's thread (toggleable), skips anything older than ~48 hours, and won't reply to a post too short to reply to.


AI REPLIES THAT SOUND LIKE YOU

• VOICE TRAINING — one tap and Ghostly reads ~50 of your own posts to learn how you actually write: sentence length, lowercase habits, punctuation, emoji use, how you open and close a thought. Every reply, quote and drafted post follows it, and it OVERRIDES the tone preset rather than blending with it. Retrain whenever your writing shifts.
• PRIVACY BY DESIGN — the sampled posts are analysed and thrown away. Only the style summary is kept; read it or delete it in Settings any time.
• SIX TONE PRESETS for before you've trained a voice — friendly, professional, funny, witty, supportive, bold.
• REPLY LENGTH — one, two or three short lines. Default one: punchy replies get read.
• ANTI-"AI TELL" PASS — a humanizing step strips the phrasing that makes a reply read as machine-written.
• SAFETY MODERATION on both the source post and the generated text, and it fails closed.
• PER-POST DEDUPE — never replies to the same post twice.


NOTHING GOES OUT UNREAD — UNLESS YOU SAY SO

• REVIEW QUEUE (on by default) — a generated reply doesn't post straight away. It waits beside the post it answers, so you can judge it in context.
• EDIT IN PLACE — fix a word before approving; your version goes out.
• APPROVE OR SKIP — approving posts it through the normal path, same caps and logging. Skipping drops it, and Ghostly won't reply to that post again.
• NOTHING IS SILENTLY LOST — the queue holds 30 and, when full, Ghostly STOPS drafting rather than discarding drafts you never saw.
• EARNED TRUST — approve 20 drafts in a row without changing a single word and Ghostly asks, once, whether it should just publish from now on. Editing a draft resets the streak, because an edit means "not quite yet". Auto-publishing can never switch itself on; only your explicit yes does it, and you can revoke it any time.


YOUR MENTIONS, ANSWERED

• Reads your notifications tab and tells apart the three things that land there: a reply to your post, a quote of it, and a plain mention.
• Prioritises them: a reply to your own post is a conversation you're already in, not a cold mention. Mentions decay fast, so fresh ones rank first.
• Drafts a response with the thread's context, so it makes sense against what you originally said.
• Runs whether or not feed engagement is on, and the same review rules apply.


WRITE AND SCHEDULE YOUR POSTS

• DRAFT WITH AI — describe your post in one line and Ghostly writes the tweet, editable before you schedule it. Add a link (auto-unfurled) and an image.
• SUGGEST POSTS — one tap drafts three ideas in your trained voice, informed by which of your posts actually performed.
• BEST TIMES — learns the hours your posts actually do well from your own history and suggests slots. Below a few days of history it says these are sensible defaults, rather than pretending it learned your audience from four posts.
• PICK THE DAY AND THE HOUR — Ghostly publishes through your own X session at that moment. If your browser is closed, it goes out when you next open it.
• THREADS — add follow-ups and Ghostly posts them as one thread. If any part fails to build, nothing posts at all: a half-posted thread can't be undone on a public timeline.
• CHARACTER LIMITS THAT MATCH YOUR ACCOUNT — Free caps at 280. X Premium unlocks a Short (~280) / Medium (~1,000) / Long (~4,000) picker. The counter, the AI draft length and scheduling all follow it, and the count includes an attached link the way X counts it.
• QUOTE CARDS — turn a post's own words into a clean typographic image. Type and data, never generated illustration: glossy AI art reads as "bot" and undoes everything the writing does.
• AUTO-POSTING (off until you turn it on) — if nothing has published in a while, Ghostly drafts and slots posts for you, bounded by how many you'll allow to wait. Post by hand all week and it never tops you up on top of your own work.
• UP TO 25 SCHEDULED at a time, with live status (Scheduled → Posting → Posted / Failed). Scheduled posts publish even while the engine is paused. Delete one to cancel it.


ASK — A COPILOT THAT SEES YOUR NUMBERS

Ask plain questions, get answers from your own data — not generic advice:

• "Which topic is working best?" • "Why didn't it do anything yesterday?" • "Why did you follow @someone?" • "Show me what you'd engage right now."

It reads your growth history and action log, explains any single action, and proposes changes — add or drop a target, change a setting, draft or schedule a post. Every change comes as a plain-English summary of exactly what will happen, and NOTHING is applied until you say "Do it". It also keeps standing instructions ("never reply to recruiters") and honours them without being asked again.

If it can't answer honestly from real data, it says so instead of guessing.


WATCH IT WORK

• SPOTLIGHT — the post Ghostly is acting on is outlined on the real page and named in the panel ("Liking this…" → "Liked", "Reply drafted — waiting for your OK"). It follows the post through timeline re-renders and onto its own page, and stays on it until the next one. It's the answer to "is this thing actually doing anything?"
• REPLY FOR ME — hover any post on x.com, click the ghost, and get a draft in your voice on demand.
• THE FLOATING GHOST — a small 44px bubble, bottom-right on x.com. It pulses while working and shows a count when something needs you. Open it into a draggable panel with Now, Review and Ask.
• ONE MARKED TAB — Ghostly works in a single reused tab, in a labelled "Ghostly" tab group coloured by state, with its own title and icon, so you always know which tab is its. After a restart it re-adopts that tab instead of opening a second one.


THE GROWTH SCOREBOARD

Everything else Ghostly records is what it DID. This is what it GOT.

• DAILY PROFILE READING — once a day it opens your own profile in the background and notes your follower and following counts. No clicks, no actions: it only looks, so it costs nothing against your caps or your monthly allowance.
• FOLLOWER TREND — a sparkline of every reading, plus change over 1 / 7 / 30 days. Each figure is labelled with the span it actually covers ("+21 over 2d"), so a three-day-old install never implies a month of history.
• REPLY PERFORMANCE — it re-reads your own Posts & replies timeline and records how each reply did: likes, replies, reposts, views. Your best performers are listed with a link to each.
• WHICH TOPICS ARE WORKING — every action records the keyword that matched it, so you can see which of your topics earns engagement and which just spends your budget.
• PER-TARGET PERFORMANCE — which creators are worth watching, and which have gone quiet.
• FOLLOW-BACK PAYOFF — of your most recent followers, how many are accounts Ghostly followed first.
• TODAY'S WINS, and a Refresh button for a reading on demand — it works even while the engine is paused, since reading your own profile isn't automation.
• WEEKLY AUTO-TUNE (off by default) — drops target creators with 21+ days of no activity. Off because it removes things you added; every drop is logged and recoverable.


BUILT TO PROTECT YOUR ACCOUNT

This is the part most tools skip.

• ONE SAFETY PRESET, NOT SIX SLIDERS — pick how hard it works and everything moves together:
   – CAREFUL: 40 likes, 8 replies, 12 follows a day, 15–75 second gaps, max 12 actions an hour, 30-minute sessions. Likes and replies only. "Best if the account matters to you."
   – BALANCED (default): 100 likes, 30 replies, 50 follows, 60 bookmarks, 8–45 second gaps, max 30 an hour, 60-minute sessions. "A pace a person could keep up."
   – GROWTH: 140 likes, 40 replies, 70 follows, max 60 an hour. Still an order of magnitude under what X actually enforces.
• RANDOM HUMAN DELAYS — 8–45 seconds between actions, never two in the same second.
• A ROLLING HOURLY CEILING on top of the daily caps, so no session can burn a whole day's budget in one burst.
• A 14-DAY WARM-UP — a new setup starts at a fraction of full pace and walks up, because going straight to full speed is the most reliable way to get limited.
• AGE-AWARE CAPS — newer accounts get safer limits, with a ±15% daily variance so your numbers aren't machine-identical every day.
• ACTIVE HOURS in your timezone — it works when you'd plausibly be awake, then stops.
• SESSIONS AND BREAKS — run 15–60 minutes, then take a real 5–30 minute break and carry on, or stop until you start it again. Your choice.
• A ONE-TAP END BUTTON that stops the working tab within about a second — checked before every post and inside every wait.
• AUTO-PAUSE ON ANOMALIES — if it can't see the page properly several times running, it stops itself rather than grinding on.
• FRESH POSTS ONLY — nothing older than ~48 hours.
• BROWSER-SESSION EXECUTION — your browser, your session, your cookies. No headless servers, no credential collection, and it never sees your X password.


COMPLETE TRANSPARENCY

• LIVE DAILY COUNTERS for every action type.
• A FULL ACTIVITY LOG — every action with its target, status and timestamp.
• IT TELLS YOU WHY IT'S IDLE — eleven specific reasons instead of silence: paused, signed out of X, outside your hours, daily caps spent, monthly allowance used, feed engagement off, nothing configured, can't reach the server, or simply nothing matched (which is a healthy feed, not a fault). Every blocked state comes with the button that unblocks it.
• DAILY RECAP EMAIL — an end-of-day summary with per-action counts, your new follows, and the FULL TEXT of every AI reply and quote it sent, so you can check it still sounds like you. Timed to your local morning, once a day, one-click unsubscribe.
• WEEKLY SUMMARY EMAIL — the bigger picture, from real activity only.
• DIAGNOSTICS — recent selector and network issues, tab timeouts and auto-pause notices, readable any time.


SET UP IN A FEW MINUTES

• GUIDED SETUP — pick a goal (grow followers, more engagement, become known for your topic, promote what you're building) and Ghostly configures the actions, pace and preset to fit.
• A DRY RUN BEFORE ANYTHING HAPPENS — ten real posts it WOULD engage, with the actual reply it would have written for each, having done none of it. Same decision path as the real engine, so what you see is what it does.
• NO SEPARATE WEBSITE to log into. Click the toolbar icon or press Alt+G for the side panel: Today, Posts, Ask, and your settings.


MAKE IT YOURS

Light, dark or follow your system. A choice of base colours and fifteen accents, with control over borders, dividers, shadows and corner radius. It should look like something you're happy to keep open all day.


BUILT TO KEEP WORKING

X changes its layout every few weeks, and when it does the buttons an extension clicks stop existing. Ghostly pulls its selector map from our server on every browser start and every 6 hours, so a fix reaches you in minutes instead of waiting days for a store review. The bundled map is the fallback and the floor: a remote update can only correct keys that already exist, every value is validated as real CSS before use, and anything invalid is ignored.

Issues it records locally are also reported centrally on their own schedule, so a break is caught before the support emails arrive.


YOUR ACCOUNT

Sign up with email and password, or continue with Google. Forgot your password and a 6-digit code arrives by email — and the reset survives closing the panel. Delete your account any time and everything goes with it: profile, action logs, drafts and local settings.


PRICING

FREE — 50 actions per month, reset monthly. Likes, replies, follows, bookmarks, reposts and quotes all count toward it. Everything else is included: voice training, the review queue, scheduling, Ask, the growth scoreboard and recap emails.

PRO — unlimited actions.
   • $2.99 per week, or
   • $7.99 per month
Pick either at checkout. Stripe handles payment, you get a self-serve billing portal, and you can cancel any time.

Reading your own profile for the growth scoreboard never counts against your allowance. Neither does a scan, a dry run, or a draft you skip.


PRIVACY

Ghostly247 acts as you, in your own browser session, and never asks for your X password.

Post text is sent to our server only to generate a reply, and only a one-way hash is kept afterwards — enough to never reply to the same post twice, not enough to reconstruct the post. Voice training keeps only the style summary, never the posts it read. Your settings stay on your machine. Payment details go to Stripe and never touch our servers.

Full policy: https://www.ghostly247.com/privacy


ONE HONEST NOTE

Automating engagement carries inherent risk to any social account, and X's own rules on automation apply to how you use this. Ghostly247's caps, delays, warm-up and active hours keep your usage conservative and human-paced, but no tool can promise an outcome. Start on Careful, run the dry run, and watch it work for a day before you let it loose.
```

---

## 4. Permission justifications

The dashboard asks for one per permission. *paste each:*

**storage**
```
Stores the user's own settings, their daily action counters, the local action log and the queue of replies awaiting their approval. All of it is the user's own configuration and activity, kept on their machine.
```

**alarms**
```
The engine is driven by a periodic alarm rather than a persistent background page, as MV3 requires. The alarm wakes the service worker roughly every 30 seconds to check whether an action is due, which is also what enforces the user's active hours, session length and pacing.
```

**identity**
```
Powers the optional "Continue with Google" sign-in via chrome.identity.launchWebAuthFlow. Used only to obtain a Google ID token for authenticating to our own API. Email/password sign-in is available and this permission is otherwise unused.
```

**sidePanel**
```
The extension's main interface is a side panel, opened by clicking the toolbar icon. It is where the user sees what the engine did, reviews and approves drafted replies, writes and schedules posts, and changes settings.
```

**notifications**
```
Alerts the user at the two moments that cannot wait: the engine is stuck and needs them (for example their X session signed out), and optionally when a large account replies to them. Hard-capped in code at a couple of notifications per day.
```

**tabGroups**
```
Places the single working tab in a clearly labelled "Ghostly" tab group, coloured by state, so the user can always tell which tab the extension is using and find it again. It also lets the extension re-adopt its own existing tab after a browser restart instead of opening a duplicate.
```

**Host permissions — ONE field for both.** The dashboard has a single
*Host permission justification* box, not one per origin, so paste this whole
block. Each paragraph names its own origin: without those names the text
reads as two orphan fragments and "these two origins" refers to nothing.
(592 of 1,000 characters.)

```
x.com and twitter.com — this is where the product does its work. The content script reads the user's timeline, search results, notifications and their own profile, and performs the actions they configured (like, reply, follow, bookmark, repost, quote) in their own logged-in session. The extension cannot function without access to these two origins.

api.ghostly247.com — our own backend. The extension calls it to sign the user in, generate AI replies and posts, sync their action log and growth history, fetch updated DOM selectors when X changes its markup, and manage their subscription.
```

**Remote code:** select **No, I am not using remote code.** Everything
executable is in the package. The extension does fetch a JSON map of CSS
selectors from our API, but those are data strings used in
`querySelector` calls and are validated as CSS before use — never evaluated
as code.

---

## 5. Privacy practices

**Single purpose** (1,000 max) — *paste.* Names the one purpose, then every
mechanism that serves it, so no shipped feature looks like a second purpose:
```
Ghostly247 helps a user grow their own Twitter/X presence, within their own logged-in Twitter/X browser session and based on settings they choose. It automates engagement actions (likes, replies, follows, bookmarks, reposts and quotes), drafts replies to their mentions in their own writing voice, and writes and schedules their posts. Every action is logged for the user to review.
```

**Data types to declare as collected:**

| Type | Declare | What it actually is |
| --- | --- | --- |
| Personally identifiable information | **Yes** | Name and email at signup |
| Authentication information | **Yes** | Password (bcrypt hashed) or Google ID token; our own JWT |
| User activity | **Yes** | The action log: action type, target handle and URL, matched keyword, success/failure, timestamp. Plus follower counts and reply performance |
| Website content | **Yes** | Post text is transmitted to generate a reply; only a SHA-256 hash is retained. Generated reply/quote text is stored |
| Financial and payment information | **No** | Handled entirely by Stripe; we store only a customer ID and subscription status |
| Health, location, personal communications, web history | **No** | Not touched |

**Certifications** — all three are true and can be checked:
- Not being sold to third parties ✓
- Not being used or transferred for purposes unrelated to the item's single purpose ✓
- Not being used or transferred to determine creditworthiness or for lending ✓

**Privacy policy URL:** `https://www.ghostly247.com/privacy` (live, 200)

---

## 6. Assets

Everything in `assets/store/` was rebuilt on 2026-09-12 for v3.0.0, around the
current blue icon. All of it is upload-ready: correct dimensions, 24-bit, and
alpha-free where the store demands it.

| File | Size | Notes |
| --- | --- | --- |
| `icon-128.png` | 128×128 | 96×96 of artwork in a 128×128 transparent canvas, per Google's padding guidance. **Upload this one.** |
| `icon-128-fullbleed.png` | 128×128 | Alternative: artwork fills all 128px. Reads larger, isn't the documented shape. |
| `promo-tile-440x280.png` | 440×280 | Icon, name, one line. No alpha. |
| `marquee-1400x560.png` | 1400×560 | Pitch plus two real panels bled off the bottom edge. No alpha. |
| `screenshot-1-sign-up.png` | 1280×800 | Start free in under a minute |
| `screenshot-2-home.png` | 1280×800 | Today's wins, while you relaxed |
| `screenshot-3-post.png` | 1280×800 | Never miss a day of posting |
| `screenshot-4-settings.png` | 1280×800 | One dial, not six sliders |
| `screenshot-5-engagement.png` | 1280×800 | Who it engages, how you sound |

The screenshots alternate which side the panel sits on, so the five don't read as
one repeated template. Each caption only claims what is visible in its capture.

**What changed.** The dashboard currently holds the retired coral-and-black ghost
and five v0.0.1 screenshots of the deleted three-tab popup. Replace all of it —
a listing whose images don't match the installed UI is both a poor first
impression and a plausible review objection.

**Rebuilding:** `assets/make-store-screenshot.py` (one screenshot from a portrait
capture) and `assets/make-promo-tiles.py` (both tiles at once). Both enforce the
no-alpha output, which is the easiest requirement to miss when exporting by hand.
See `assets/README.md`.

**Two things in the captures to decide on before uploading:** screenshot 2 shows
the handle `@_Garg_Sarthak` and screenshot 4 shows `admin@buildstory.studio`.
Both go public on the listing. Fine if they're yours; re-capture with neutral
values if not. Screenshot 2's capture is also clipped at the bottom ("RIGHT NOW"
is cut off behind the floating nav) — re-capture that screen a little taller and
rerun the script if it bothers you.

---

## 7. What's new in 3.0.0

*paste into the release notes / "What's new" field:*

```
• A side panel replaces the popup — more room for what the engine is doing, and it stays open as you move between tabs.
• A floating ghost on x.com with Spotlight: see the exact post being acted on, outlined on the page.
• "Reply for me" — hover any post for a draft in your voice.
• Answers your mentions, with thread context.
• Writes and schedules posts for you, informed by which of your own posts performed.
• Ask: a copilot that can read your own numbers and change a setting when you approve.
• One reused working tab in a labelled "Ghostly" group, instead of tabs opening and closing all day.
• Pause now stops the working tab in about a second.
• Sessions take a break and resume instead of ending your day.
• Whole-word keyword matching — "ai" no longer matches "said".
• Follower and reply-performance tracking, with a daily sparkline.
• Selectors now update from the server, so an X layout change is fixed in minutes instead of days.
```

---

## 8. Pre-submit checklist

- [x] **Google sign-in — verified, no action needed.** The client ID is identical
      across `apps/extension/.env`, `.env.production`, the server's
      `GOOGLE_CLIENT_ID`, and the JS inside the 3.0.0 zip, so 3.0.0 behaves
      exactly as 2.0.0 did. The redirect URI comes from
      `chrome.identity.getRedirectURL()`, i.e. the runtime extension ID, so the
      published item needs
      `https://olfnjmpoacjchlklmdlaimpckblmokga.chromiumapp.org/` authorized in
      Google Cloud — which it must already be, since 2.0.0 shipped with Google
      sign-in working and the item ID doesn't change between versions. Only
      revisit if those URIs were edited since, or if you ever publish under a
      new store item.
- [x] ~~Re-shoot the five screenshots~~ — done 2026-09-12, plus the icon and both
      promo tiles (§6). Decide on the real handle/email visible in shots 2 and 4.
- [ ] Load `releases/ghostly247-extension-3.0.0.zip` unpacked once and confirm it
      talks to production: sign in, and check the Network tab hits
      `api.ghostly247.com` and not localhost.
- [ ] `https://api.ghostly247.com/api/health` returns `db: "connected"`.
- [ ] Stripe is in live mode on the server, and `STRIPE_PRICE_MONTHLY` /
      `STRIPE_PRICE_WEEKLY` point at live prices.
- [ ] Prices in the listing ($7.99/mo, $2.99/wk) match the live Stripe Prices
      that `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_WEEKLY` point at, and match
      `PLAN_PRICING` in `packages/shared/src/types/user.ts`.
- [ ] Upload the zip, paste §2–§5, set §7 as the release notes, submit.

### Not a blocker, but worth knowing

Engagement-automation extensions do get extra scrutiny, and X's own automation
rules apply to how users run this. The description in §3 deliberately leads with
the safety limits and includes a plain note about that risk — keep it. Removing
it to make the pitch cleaner would make the listing less honest, not more
approvable.
