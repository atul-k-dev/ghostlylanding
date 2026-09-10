# Ghostly247 — End-to-End Transformation Plan

> **Status:** Phase 0 code-complete (0.1–0.7) · Phase 1 in progress (1.1–1.2 done)
> · **All Manual QA deferred to the end of the rebuild at the owner's request (2026-09-10)** · 2.5 spike still awaiting Chrome verification
> **Owner:** Atul Kumar · **Created:** 2026-09-10 · **Last updated:** 2026-09-10
> **Baseline commit:** `e29faf6` (on `main`) · **Extension version at baseline:** `2.1.0`
> **Working branch:** `feat/two-mode-rebuild` — **all work in this plan is committed here, never to `main`.**

This file is the single source of truth for rebuilding Ghostly247 from its current
shape (a background engagement bot with a 480×480 popup) into its target shape
(a two-mode extension: a floating companion on X, and a Chrome side panel that
carries the whole product).

---

## 0. How to use this file

**If you are an AI agent picking up this project, read this section fully before touching code.**

### The operating rules

1. **Read `CONTEXT.md` first**, then this file. `CONTEXT.md` holds the product
   vision and coding conventions. This file holds the build sequence.
2. **Work one step at a time, in order.** Phases have hard dependencies. Do not
   jump ahead. If a task you have been given does not fit the current phase, say
   so and propose deferring it.
3. **Never start a step until the previous step's "Done when" checklist passes.**
4. **Mark progress by editing this file.** Change `- [ ]` to `- [x]` on each step
   as you complete it, and append a line to the Progress Log at the bottom
   (§10) with the date, the step ID, and the commit hash.
   Markers: `- [ ]` not started · `- [x]` done and verified · `- [~]` built but
   **blocked on a verification someone has to perform** — never treat a `[~]` as
   done, and never build anything that depends on it until it becomes `[x]`.
5. **Do not regenerate what exists.** Check the repo first. Most of the hard
   parts (voice training, AI generation, moderation, image attaching, growth
   maths, safety counters) are already built and working.
6. **Every step lists its own tests.** Run them. If a step has no automated test
   possible, it has a Manual QA block instead — actually perform it, do not
   assume.
7. **Never weaken a safety guard to make a test pass.** If a cap, delay, or
   moderation check is in the way, the test is wrong, not the guard.
8. **Do not bump the extension version** until a phase is fully complete and
   verified. One version bump per shipped phase.
9. **Commit to `feat/two-mode-rebuild`, never to `main`.** Branch off it for a
   phase if you like (`feat/phase-2-floating-panel`), but merge back into it, not
   into `main`. `main` stays at the last shipped Chrome Web Store build so there
   is always a known-good version to fall back to.
10. **One commit per step**, referencing the step ID in the message, so each row
   of the Progress Log (§10) has its own hash.

### The commands you will use

```bash
pnpm install                                   # once, at repo root
pnpm --filter @casper/extension dev            # HMR dev build, load dist/ unpacked
pnpm --filter @casper/extension build          # typecheck + production build
pnpm --filter @casper/extension test           # all smoke suites (7 as of 2026-09-10)
pnpm --filter @casper/extension typecheck      # tsc --noEmit only
pnpm --filter @casper/server dev               # API on :4000
pnpm typecheck                                 # every workspace
pnpm build                                     # every workspace
```

Smoke tests live in `apps/extension/scripts/*.mts`, run with `tsx`, print `✓`/`✗`
per assertion and `process.exit(1)` on any failure. New tests must follow the
same shape — see `scripts/relevance-smoke.mts` as the template.

### Loading the extension in Chrome

1. `pnpm --filter @casper/extension build`
2. `chrome://extensions` → Developer mode on → **Load unpacked** → `apps/extension/dist`
3. After a rebuild, hit the reload icon on the extension card.
4. Service worker logs: click **service worker** on the extension card.

---

## 1. What we are building — the target product

A **single Chrome extension** with **two modes** and **no separate website app**.

### Mode A — the floating panel (x.com / twitter.com only)

Injected by the existing content script into a **Shadow DOM** overlay. Three states:

| State | What it is |
|---|---|
| **Bubble** | 44px ghost, bottom-right. The resting state, seen ~95% of the time. Coral pulse while acting; amber ring + count when something needs the user. |
| **Brief** | ~360×520 draggable panel. Tabs: **Now · Review · Ask**. Toolbar: Spotlight, Pause, Expand, Close. Status bar at the bottom. |
| **Closed** | Gone for the session. Bubble returns on next visit. |

Two capabilities that only exist because it lives on the page:

- **Spotlight** — outlines the exact post the engine is acting on, in coral, in
  the real feed, and narrates it in the panel.
- **Reply for me** — a ghost button on hover in any post's action bar; drafts a
  reply in the user's voice on demand.

### Mode B — the side panel (any tab)

`chrome.sidePanel`, ~400px, resizable, persists across tabs. Opened by clicking
the extension icon. Five tabs plus a gear:

`Today · Review · Posts · Growth · Ask` — and behind ⚙: `Who I watch · Voice · Settings`

### What is deleted

- The popup (`src/popup/index.html` as the action's `default_popup`)
- The six-tab `Dashboard.tsx` structure (2,915 lines — dismantled into pages)
- `Watch it work` toggle (replaced by Spotlight)
- `Browse like a human` toggle (becomes always-on)
- `Run for 30/60/90` + manual re-arm (replaced by active hours)
- `Account age (months)` input (folded into the safety preset)
- `Clear the action queue` button (self-heals; debug panel only)
- The `How to use Ghostly247` link to the marketing site

### What is explicitly NOT in scope

- No separate web app, no `app.ghostly247.com`, no web login.
- No server-authoritative settings migration. `chrome.storage.local` stays the
  source of truth. (This was previously planned; it is **cancelled** — it only
  existed to let a website change settings, and there is no website.)
- No LinkedIn. Automation for it was already removed; the types remain inert.

---

## 2. Current state of the codebase

### Layout

```
apps/
  extension/          MV3 extension — Vite + @crxjs + React 19 + Tailwind 4
    manifest.config.ts    buildManifest(apiBaseUrl) — permissions, content scripts
    vite.config.ts        rollupOptions.input currently only { popup }
    scripts/*.mts         7 tsx smoke suites
    src/
      background/index.ts   service worker; asyncHandlers registry (~40 messages)
      content/twitter.ts    content script entry — 17 lines, message handler only
      lib/                  storage.ts (settings + DEFAULT_SETTINGS), api.ts,
                            messages.ts, schedule-time.ts, selector-config.ts
      platforms/
        common/             content-messages.ts (typed msg contracts), relevance.ts,
                            tab-driver.ts
        twitter/            autopilot.ts (the feed loop), selectors.ts, comment.ts,
                            compose.ts, follow.ts, stats.ts, dom.ts, handler.ts
      popup/                Popup.tsx, views/Dashboard.tsx (2,915 lines), LoggedOut.tsx
      scheduler/            scheduler.ts (alarm tick), executor.ts, quotas.ts,
                            timegate.ts, queue.ts, counters.ts, action-log.ts,
                            diagnostics-log.ts, scheduled-posts.ts, types.ts
  server/             Express + Mongo + OpenAI. Routes under /api/*
  landing-page/       Next.js marketing site (stays as-is)
  admin/              Next.js internal panel (stays as-is)
packages/shared/      Types + FREE_TIER + isPro + growth/settings/user contracts
```

### What already works and must not be rebuilt

| Capability | Where |
|---|---|
| Voice training (GPT-5.5, JSON mode, style guide) | `server/src/openai/train-voice.ts` |
| Reply generation + anti-AI-tell humanizer | `server/src/openai/generate-comment.ts`, `humanize.ts` |
| Post drafting with char-limit enforcement | `server/src/openai/generate-post.ts` |
| Batch idea generation informed by best posts | `server/src/openai/generate-ideas.ts` |
| OpenAI moderation | `server/src/openai/moderation.ts` |
| Image attach to X composer (refuses to post without it) | `extension/src/platforms/twitter/compose.ts` |
| Thread posting | `compose.ts` + `scheduled-posts.ts` |
| Daily caps, age multiplier, ±15% variance | `extension/src/scheduler/quotas.ts` |
| Action log + diagnostics buffering and flush | `extension/src/scheduler/action-log.ts`, `diagnostics-log.ts` |
| Growth scrape + follower series maths | `twitter/stats.ts`, `server/src/growth/series.ts` |
| Remote selector overrides (hostile-input hardened) | `twitter/selectors.ts`, `lib/selector-config.ts` |
| Daily recap email (tz-aware, dedup-safe) | `server/src/jobs/daily-summary.ts` |
| Auth: email/password + Google + reset | `server/src/routes/auth.ts`, `popup/views/LoggedOut.tsx` |
| Stripe checkout + webhook + portal | `server/src/stripe/`, `routes/billing*.ts` |

### Verified defects this plan fixes

Each was confirmed by reading the code at commit `e29faf6`.

| ID | Defect | Evidence |
|---|---|---|
| **D1** | Action delay is 3–7s, not the documented 8–45s. The correct value exists but gates scheduler *ticks*, not in-session actions. | `timegate.ts:8` defines `nextActionDelayMs()` = 8–45s; used only at `scheduler.ts:546`. `executor.ts:284,627-628` hardcode `minDelayMs: 3_000, maxDelayMs: 7_000`; consumed at `autopilot.ts:612`. |
| **D2** | No per-hour rate ceiling. One session gets the full remaining daily budget (100+30+50+60+30+15 = **285** actions possible in one hour). | `executor.ts:504-508` comment + `storage.ts:74-81` caps. |
| **D3** | `ageMultiplier(null)` returns `1.0` — unknown account age silently grants **full** caps, and the UI says "Leave blank if unsure." | `quotas.ts:10-14`; `Dashboard.tsx:769`. |
| **D4** | Media/video posts are invisible. `readArticle` reads only `[data-testid="tweetText"]`; a captionless video yields `''`, and `isRelevant('', keywords)` is `false` whenever keywords are set — so the post is skipped entirely. | `autopilot.ts:69`, `relevance.ts:56`, gate at `autopilot.ts:682`. No `tweetPhoto`/`videoPlayer`/card/alt selector exists in `selectors.ts`. |
| **D5** | "Show more" is never clicked; truncated text is replied to. Quoted-tweet text never read (first `querySelector` wins). | `autopilot.ts:69` |
| **D6** | Active hours are dead code. `isActiveNow` is called by nothing — not even a test. No UI control exists in `Dashboard.tsx`. | `timegate.ts:58`; `scheduler.ts:5-17` header documents it as gate #2. |
| **D7** | Whitelist is not honored in the main follow path. `HomeAutopilotOptions` has no whitelist field. UI claims "will never follow accounts on this list." | `content-messages.ts:94-150`; honored only at `executor.ts:269-271`; copy at `Dashboard.tsx:2381`. |
| **D8** | Topic feeds silently do nothing unless home-feed toggles are on. | `executor.ts:467-472` (`doLike = hf.like`), `scheduler.ts:406` + `527-542`. |
| **D9** | Follows have zero quality filter — follows whoever is next in a followers list. Bio text is in the same DOM node and never read. | `follow.ts:50-100`, `scanFollowers` returns `{handle, profileUrl}` only. |
| **D10** | `looksLikeReply` is English-only (`/^replying to\b/i`), breaking `skipReplies` and scoreboard `isReply` on non-English UIs. | `stats.ts:143-146` |
| **D11** | `FREE_TIER.maxPlatforms` and `aiCommentsEnabled` are declared and never read. | `packages/shared/src/types/user.ts:63-64` |
| **D12** | The "nothing queued" reason exists only as a `console.log` in the service worker; it never reaches a screen or diagnostics. | `scheduler.ts:209` — that string appears in exactly one place in the repo. |
| **D13** | Docs promise "8–45 seconds" in `CONTEXT.md:122` **and** in the customer-facing `docs/Ghostly247-Five-Features.pdf`. Code does 3–7s. | Fixed by D1; the claim then becomes true. |
| **D14** | No onboarding of any kind. Every default ships off (`isPaused: true`, `homeFeed.enabled: false`, `keywords: []`, `targetCreators: []`), so a new user turns it on and nothing ever happens. | `storage.ts:48-110` |
| **D15** | Notifications tab is never read. No mentions, no replies-to-replies. Zero handling in the entire codebase. | grep: no matches |

---

## 3. Conventions & guardrails

Follow `CONTEXT.md` §12. Reinforced here for the things this plan touches most:

- **TypeScript strict. No `any`** unless justified in a comment on the line above.
- **Tailwind utility classes.** No new CSS files. The one exception is the Shadow
  DOM style injection in Phase 2, which is unavoidable and documented there.
- **`async`/`await`.** No `.then()` chains.
- **Extension messaging** is always `{ type, payload }`, type-narrowed on `type`,
  registered in the `asyncHandlers` map in `background/index.ts`.
- **API responses** are always `{ ok, data?, error? }`.
- **Every like/comment/follow writes a typed `ActionLog` entry.** Never bypass
  `recordAction`.
- **Naming:** `kebab-case` folders, `PascalCase` components, `camelCase` everything else.
- **When in doubt about safety, choose the more conservative option.** This
  overrides any other consideration in this plan.

### Copy rules

Every string the user reads follows these:

- Say what happened or what is happening, in present tense, naming the real thing.
  `Reading @levelsio's new post` — not `3 pending · 12 done · 0 failed`.
- Lead with outcomes, not budgets. `+6 followers today` before `62% of safe pace`.
- Never show a blocked state without the button that unblocks it.
- Errors say what went wrong and what to do. No apologies.
- One "needs you" card at a time. Never a list of six problems.

### Design tokens

Extend `apps/extension/src/popup/styles.css` (which becomes the shared theme file).
Existing brand tokens stay; add semantic state colours:

```
--color-casper-bg        #0e0e0e   canvas
--color-casper-surface   #1b1b1b   cards
--color-casper-border    #2e2e2e   hairlines
--color-casper-fg        #f4f4f5   primary text
--color-casper-muted     #a1a1aa   secondary text
--color-casper-coral     #f44d60   BRAND + primary action + spotlight  (add)
--color-casper-working   #3fbf87   running / gained / healthy          (add)
--color-casper-attention #e6a53a   needs a human                       (add)
```

**Coral already occupies red**, so a separate destructive red would read as a
mistake. Signal destructive by *weight, not hue*: brand/primary uses coral as
text, hairline and 12% tint; destructive uses coral as a **solid fill** with dark
text. Green and amber carry the other two states and are never the accent.

**Minimum type size is 12px.** The current popup uses 10–11px on a dark ground.
Body is 14px. Numbers that matter get to be large. `tabular-nums` wherever digits stack.

---

## PHASE 0 — Safety foundation

> **Goal:** Make the engine paced like a human before making it more visible.
> **Depends on:** nothing. **Blocks:** everything.
> **Why first:** Every phase below increases how much the engine does and how
> visible it is. Doing that on 3-second gaps produces bans, and "the safest
> option" is the product's entire positioning. This phase also makes the
> customer-facing 8–45s claim true (D13).

### Steps

- [x] **0.1 — Thread the real delay range into the session.** ✅ 2026-09-10
      Fixes **D1**.
      - Export a delay range from `scheduler/timegate.ts` (keep `nextActionDelayMs()`
        as-is for tick scheduling; add `ACTION_DELAY_MS = { min: 8_000, max: 45_000 }`).
      - Replace the hardcoded `minDelayMs: 3_000, maxDelayMs: 7_000` at
        `executor.ts:284` and `executor.ts:627-628` with that range.
      - Leave `autopilot.ts:612` `pause()` as-is — it already reads
        `opts.minDelayMs`/`opts.maxDelayMs`.
      - **Remove the ⚠️ annotation from `CONTEXT.md` §10** ("NOT TRUE OF THE CODE
        YET"). This step is what makes the 8–45s claim true, so the warning must
        come out here — and not one step earlier. Fixes **D13**.
      - `docs/Ghostly247-Five-Features.pdf` is now safe to re-publish.

- [x] **0.2 — Add a per-hour action ceiling.** ✅ 2026-09-10
      Fixes **D2**.
      - New module `src/scheduler/rate-limit.ts`: a rolling 60-minute counter
        persisted to `chrome.storage.local`, with `canActNow()` and `recordActed()`.
      - Ceiling derives from the safety preset (Phase 1.3): Careful 12/h,
        Balanced 30/h, Growth 60/h. Until presets exist, default to **30/h**.
      - Enforce inside the autopilot loop in `autopilot.ts` **before** each action,
        not only at session start — a session runs up to 60 minutes.
      - When the ceiling is hit mid-session, the loop waits rather than exiting,
        so the tab stays open and behaves like a person taking a break.

- [x] **0.3 — Flip the unknown-age default to conservative.** ✅ 2026-09-10
      Fixes **D3**.
      - `quotas.ts:10-14` — `ageMultiplier(null)` returns `0.5`, not `1.0`.
      - Update the comment above it to say why (unknown age is treated as new).

- [x] **0.4 — Wire up active hours.** ✅ 2026-09-10
      Fixes **D6**.
      - Call `isActiveNow(settings)` in the scheduler tick as gate #2, exactly
        where `scheduler.ts:5-17` already documents it.
      - Scans pass through gates 2–4 but not 6, per the existing header contract.
      - When outside active hours, write a diagnostic (see 0.6) rather than
        failing silently.

- [x] **0.5 — Variable scroll and dwell.** ✅ 2026-09-10
      Partly addresses **D1**'s "looks like a robot" half.
      - `autopilot.ts:918-919` — replace fixed `smoothScrollBy(700)` / `wait(650)`
        with randomised ranges (scroll 400–1100px, pause 400–1400ms).
      - Add read-dwell proportional to content on posts it *considers*, not only
        ones it acts on: `~words / 4 words-per-second`, floored at 1.5s, capped at 12s.

- [x] **0.6 — Surface the blocking reason.** ✅ 2026-09-10
      Fixes **D12**.
      - Replace the `console.log` at `scheduler.ts:209` with a typed
        `BlockReason` written to `chrome.storage.local` under a new key
        `casper.blockReason`, plus the existing `appendDiagnostic`.
      - Reasons to model now: `not-configured`, `feed-off`, `caps-spent`,
        `outside-hours`, `signed-out`, `free-cap`, `sub-lapsed`, `degraded`,
        `paused`, `nothing-matched`, `server-unreachable`.
      - Nothing renders it yet — Phase 1 consumes it. Writing it now means the
        UI phase has real data to build against.

- [x] **0.7 — Correct the scheduler header comment.** ✅ 2026-09-10
      `scheduler.ts:5-17` currently documents two gates that did not exist. After
      0.4 gate #2 is real; confirm gate #8's wording distinguishes tick jitter
      from in-session action delay.

### Tests

- [x] **New:** `scripts/pacing-smoke.mts` ✅ 2026-09-10 — **63 assertions, green.**
      Grown one step at a time (0.1 → 0.2 → 0.3 → 0.4 → 0.5), plus scroll/dwell.
      - `ACTION_DELAY_MS` min ≥ 8000 and max ≤ 45000.
      - `ageMultiplier(null) === 0.5`; `ageMultiplier(3) === 0.5`;
        `ageMultiplier(8) === 0.75`; `ageMultiplier(18) === 1.0`.
      - Rate limiter: 30 recorded actions inside one hour → `canActNow()` false;
        after the window rolls → true.
      - `isActiveNow` returns false when `isPaused`, false outside the window,
        true inside — including the overnight (22→6) case.
- [x] Add `pacing-smoke` to the `test` script in `apps/extension/package.json`. ✅
- [x] `pnpm --filter @casper/extension test` — **8** suites pass. ✅
      (The plan said 7; `block-reason-smoke` was added by 0.6, making pacing the 8th.)
- [x] `pnpm --filter @casper/extension typecheck` — clean. ✅ `build` clean too.

### Manual QA

- [ ] Load unpacked, sign in, enable home feed with one broad keyword, click Active.
- [ ] Watch the service worker console: consecutive actions are **≥ 8s apart**.
      Time ten of them; none under 8s.
- [ ] Set the hourly ceiling to 3 temporarily, confirm the session pauses after
      3 actions and resumes rather than closing the tab. Revert the value.
- [ ] Set active hours to a window that excludes now; confirm the tick skips and
      `casper.blockReason` reads `outside-hours` in `chrome.storage.local`.

### Done when

- [x] All 7 smoke suites green. ✅ — 8 of them, 239 assertions.
- [ ] Ten consecutive live actions timed, none under 8 seconds. ← **needs Chrome**
- [ ] `casper.blockReason` is written for at least 3 distinct conditions. ← **needs Chrome**
- [x] `CONTEXT.md:122`'s "8–45 seconds" claim is now true of the code. ✅ (0.1)
- [x] Committed. Progress logged in §10. ✅

> **Phase 0 is code-complete and blocked on the Manual QA above.** Per rule 3,
> Phase 1 does not start until the two live checks pass. Nothing here is `[~]`
> at the step level — each step's own behaviour is covered by `pacing-smoke` —
> but the phase gate is the live timing run, which no test can stand in for.

---

## PHASE 1 — Side panel shell, setup flow, dry run

> **Goal:** Replace the popup with a side panel, and fix the silent dead end that
> loses most new users (**D14**).
> **Depends on:** Phase 0.

### Steps

- [x] **1.1 — Manifest and build wiring.** ✅ 2026-09-10
      - `manifest.config.ts`: add `"sidePanel"` to `permissions`; add
        `side_panel: { default_path: 'src/sidepanel/index.html' }`; **remove**
        `action.default_popup`.
      - `background/index.ts`: on install, call
        `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
      - `vite.config.ts`: add `sidepanel: 'src/sidepanel/index.html'` to
        `build.rollupOptions.input` alongside the existing `popup` entry.
      - Keep `src/popup/` on disk for now — Phase 1.6 deletes it, and having both
        during the transition makes the diff reviewable.

- [x] **1.2 — App shell.** ✅ 2026-09-10
      - New `src/sidepanel/index.html`, `main.tsx`, `App.tsx`.
      - New `src/ui/` — the shared component library used by **both** modes.
        Start with: `Panel`, `TopBar`, `TabBar`, `StatusBar`, `Card`, `Button`,
        `Stat`, `PaceBar`, `FeedLine`, `EmptyState`.
      - Shell renders: top bar (👤 ⚙ ⏸ →|), tab bar
        (`Today · Review · Posts · Growth · Ask`), body, status bar.
      - Status bar: left = live engine state, right = safe-pace percentage.
      - Move `src/popup/styles.css` → `src/ui/theme.css`; add the three semantic
        tokens from §3.

- [ ] **1.3 — Safety presets.**
      - New `src/lib/presets.ts` exporting `Careful | Balanced | Growth`, each
        setting caps, delay range, hourly ceiling, session length, enabled action
        types, and warm-up ramp together.
      - Add `safetyPreset` and `warmupStartedAt` to `ExtensionSettings` in
        `packages/shared/src/types/settings.ts` and to `DEFAULT_SETTINGS`.
      - Warm-up: ramp from ~10% to 100% of caps over 14 days from
        `warmupStartedAt`. Applied in `quotas.ts` alongside `ageMultiplier`.
      - `accountAgeMonths` stays in the type but is set by a single checkbox in
        the setup flow, never a free-text number field.

- [ ] **1.4 — Setup flow (3 steps).**
      - New `src/sidepanel/pages/Setup.tsx`.
      - **Step 1 — read the account.** New content-script capability: read the
        signed-in user's bio, last 30 posts, and following list from the already-open
        X tab. Feed the posts to the existing `TRAIN_VOICE` handler. Propose
        topics and 10 target accounts, each with follower count and a one-line reason.
        Buttons: `Looks right →` · `Let me edit`.
      - **Step 2 — safety preset.** Three cards from 1.3, `Balanced` preselected.
        One checkbox beneath: *"Account under 6 months old? I'll start slower"* —
        **defaults checked**.
      - **Step 3 — dry run.** See 1.5.
      - On finish: write settings, set `warmupStartedAt`, set `isPaused: false`.

- [ ] **1.5 — Dry run.**
      - New message `DRY_RUN` + executor path that runs the existing home-feed
        scan with **every action call disabled**, returning the 10 posts it would
        have engaged and the reply it would have drafted for each.
      - Reuse `runInlineAutopilot`'s selection logic; do not fork it. Gate the
        action blocks behind an `opts.dryRun` flag on `HomeAutopilotOptions`.
      - Each card: `Good` / `Not this one`. Rejections append to `excludeKeywords`
        heuristically and are stored for later voice tuning.
      - Clicking a card scrolls the X tab to that post and outlines it — this
        shares the Spotlight primitive built in Phase 2, so if 2.3 is not yet
        built, ship 1.5 with the scroll only and add the outline in Phase 2.

- [ ] **1.6 — Port the remaining pages, delete the popup.**
      - `Today` — live status, the `blockReason` card from 0.6, three outcome
        numbers with yesterday beneath, pace bar, live feed from the action log.
      - `Review` — port from `Dashboard.tsx:995-1112`, add `Edit & post`,
        `Never like this`, `Post all`.
      - `Posts` — port `ScheduleTab` (`Dashboard.tsx:1494-2011`). Week strip
        instead of a flat list. Still manual until Phase 3.
      - `Growth` — port `GrowthTab` (`Dashboard.tsx:1219-1380`) unchanged for now.
      - `Ask` — placeholder that says it arrives in Phase 5. Do not fake it.
      - `⚙ Who I watch` — merge `HomeFeedSection`, `SearchSection`, `TargetsSection`,
        `WhitelistSection` into one page with a live match count.
      - `⚙ Voice` — port from `SettingsTab`'s voice section, add the reply preview.
      - `⚙ Settings` — account, plan, notifications, timezone, delete. Nothing else.
      - Delete `src/popup/` and its vite input. `LoggedOut.tsx` and
        `ForgotPassword.tsx` move to `src/sidepanel/pages/`.

- [ ] **1.7 — The condition table.**
      Render all 15 states from the design brief, driven by `casper.blockReason`.
      One card at a time, each with its one button. Copy is fixed — do not improvise it.

### Tests

- [ ] **New:** `scripts/presets-smoke.mts` — each preset produces caps within its
      stated band; warm-up at day 0 ≈ 10%, day 7 ≈ 55%, day 14+ = 100%; warm-up
      and `ageMultiplier` compose multiplicatively and never exceed base caps.
- [x] **New:** `scripts/block-reason-smoke.mts` — a settings/counter fixture for
      each of the 11 reasons resolves to the expected `BlockReason`, and precedence
      is deterministic when two apply at once (`paused` wins over everything;
      `signed-out` beats `caps-spent`). ✅ 2026-09-10 — 25 assertions, green.
      **Note:** built during Phase 0 rather than Phase 1, since the resolver it
      tests ships with 0.6. Phase 1 consumes it, it does not build it.
- [ ] Add both to the `test` script.
- [ ] `pnpm --filter @casper/extension test` — 9 suites green.
- [ ] `pnpm --filter @casper/extension build` — succeeds, `dist/` contains
      `sidepanel` and no `popup`.

### Manual QA

- [ ] Fresh profile, load unpacked, click the icon → **side panel opens**, no popup.
- [ ] Sign up as a brand-new user → setup opens automatically on x.com.
- [ ] Step 1 returns real topics and real handles from the signed-in account.
- [ ] Step 3 shows 10 real posts with 10 real drafted replies, and **posts nothing**
      (verify against the account's actual X timeline and the action log).
- [ ] Finish setup → engine arms → within 5 minutes the Today feed shows real actions.
- [ ] Force each of these and confirm the right card with the right button:
      not configured · feed off · caps spent · outside hours · signed out of X ·
      free cap hit · paused · nothing matched.
- [ ] Resize the panel to 320px — nothing clips, nothing scrolls sideways.

### Done when

- [ ] A brand-new user reaches "engine doing real work" in under 2 minutes with
      no help and no console.
- [ ] All 9 suites green; production build clean.
- [ ] `src/popup/` no longer exists.
- [ ] Version bumped to `2.2.0`. Committed. Logged in §10.

---

## PHASE 2 — Floating panel, Spotlight, Reply for me

> **Goal:** Put the product on the page it works on, and let it point at the work.
> **Depends on:** Phase 1 (shares `src/ui/`).
> **No new permissions required** — the content script already runs on x.com.

### Steps

- [ ] **2.1 — Shadow DOM mount.**
      - Extend `src/content/twitter.ts` to mount a React root inside a closed
        Shadow DOM attached to a `<div>` appended to `document.body`.
      - **Shadow DOM is non-negotiable.** X's CSS is aggressive and Tailwind will
        leak both directions without it. Inject the compiled stylesheet into the
        shadow root via a `<style>` node — this is the documented exception to the
        no-CSS-files convention in §3.
      - Guard against double-mount on SPA navigation.
      - Never mount inside X's own React tree; always a sibling of `body`.

- [ ] **2.2 — The three states.**
      - Bubble (44px, bottom-right), Brief (~360×520), Closed.
      - Draggable by the `⠿` handle; snaps to corners; position persisted per-origin
        in `chrome.storage.local`.
      - Closed persists for the session only (`sessionStorage`), so the bubble
        returns on the next visit. **Never trap a user in a UI they closed.**
      - Toolbar: `👁` Spotlight toggle · `⏸` stop/start · `⤢` expand · `✕` close.
      - Tabs: `Now · Review (count) · Ask`.
      - Status bar identical to the side panel's.

- [ ] **2.3 — Spotlight.**
      - When the engine is about to act on a post currently in the viewport,
        outline it (`2px solid coral`, `outline-offset: 2px`, 6% coral wash) and
        show `● Ghostly is replying to this` in the panel.
      - Outline is drawn on the real article element; remove it on completion or
        on navigation. Never leave a stray outline.
      - Toggle defaults **on**. It replaces the `visibleMode` ("Watch it work")
        setting, which is deleted here.
      - Respect `prefers-reduced-motion` — no pulse animation when set.

- [ ] **2.4 — Reply for me.**
      - Inject a `👻 Reply for me` button into each post's action bar
        (`S.actionBarRow`) on hover.
      - Click → `DRAFT_COMMENT` for that post → draft appears in the panel with
        `Post it` / `Change it` / `Never mind`.
      - **Counts against caps and the monthly free allowance** like any other
        reply. Never a bypass.
      - Any edit the user makes is stored as a `(generated, corrected)` pair for
        Phase 6's voice tuning.

- [~] **2.5 — Expand to side panel.** ⏳ 2026-09-10 — spike built and building
      clean; **awaiting the manual Chrome verification below.**
      - `⤢` sends a message that calls `chrome.sidePanel.open()`.
      - **Prototype this interaction before building the toolbar around it.**
        Opening the panel programmatically requires a user gesture, and whether a
        content-script click carries that gesture through is the one thing in this
        design that cannot be confirmed by reading code.
      - **Fallback if it does not hold:** register a `chrome.commands` keyboard
        shortcut (`Alt+G`), which does count as a gesture, and change the `⤢`
        button to prompt for it.

### Tests

- [ ] **New:** `scripts/floating-smoke.mts` — pure-logic only (no DOM):
      state machine transitions (bubble→brief→closed→bubble-next-session),
      corner-snap maths, and the "is this element in the viewport" predicate.
- [ ] Add to the `test` script. All 10 suites green.

### Manual QA

- [ ] On x.com the bubble appears bottom-right and does not cover the compose box
      or the right-hand sidebar at 1280px, 1440px and 1920px widths.
- [ ] Drag to each corner; reload; position persists.
- [ ] Close it; navigate within X; it stays closed. Open a new X tab; bubble returns.
- [ ] With Spotlight on, watch a full reply cycle: the correct post outlines, the
      panel names the same author, the outline clears afterward.
- [ ] Scroll while an action is mid-flight — no stray outlines left behind.
- [ ] Hover a post → `Reply for me` appears → draft arrives in the panel → posting
      it increments the comment counter and writes an action log entry.
- [ ] Zero style bleed: X's own UI is visually unchanged with the panel mounted;
      the panel is unaffected by X's CSS. Check in both X light and dark themes.
- [ ] `⤢` opens the side panel (or the documented fallback works).

### Done when

- [ ] A full engagement cycle is watchable end-to-end on the live feed.
- [ ] No visual regression to x.com itself in either X theme.
- [ ] All 10 suites green.
- [ ] Version `2.3.0`. Committed. Logged in §10.

---

## PHASE 3 — Auto-posting and the content pipeline

> **Goal:** Stop driving traffic to an empty profile.
> **Depends on:** Phase 1 (Posts tab exists).
> **Context:** The engagement half is fully autonomous; the publishing half is
> 100% manual. Replies get you *seen*; posts get you *followed*. Roughly 90% of
> the parts already exist — generation, formatting, scheduling, image attach,
> threads, moderation, failure handling.

### Steps

- [ ] **3.1 — Best-time model.**
      - New `src/lib/best-times.ts`: from the user's own `PostOutcome` history,
        derive per-weekday-hour performance and return the top N slots.
      - Needs ≥ 14 days of data; below that, fall back to two sensible slots and
        **say so in the UI** rather than implying it is personalised.

- [ ] **3.2 — Auto-draft loop.**
      - Daily scheduler task: if the user has published nothing in > N hours and
        has fewer than M drafts queued, call the existing `GENERATE_IDEAS` path
        (which already uses voice + topics + best-performing posts) and schedule
        the results at slots from 3.1.
      - Cadence comes from the safety preset. Default 1–2/day.

- [ ] **3.3 — Graduated trust.**
      - Extend `replyApproval` into a general trust level covering posts too.
      - Track consecutive approvals with **zero edits**. At 20, offer:
        *"You've approved 20 in a row without changing a word. Want me to just
        post them from now on? You'll still see everything, and you can undo any of it."*
      - Any edit resets the streak. Trust is earned, never assumed, never defaulted on.

- [ ] **3.4 — Posts tab, filled.**
      - Week strip with drafts in place; empty slots become `+ Ask Ghostly for one`.
      - Card editor: text, X preview, image, `Publish now` / `Reschedule` /
        `Rewrite it` / `Delete`.
      - Top card when true: *"You haven't posted in 5 days. I sent 90 people to
        your profile this week."* → `Write two for me`.

- [ ] **3.5 — Review that learns.**
      - `Edit & post` stores `(generated, corrected)` pairs.
      - `Never like this` appends to the exclusion list without ever showing the
        user the phrase "exclude keywords".
      - `Post all`.

- [ ] **3.6 — Quote cards (optional, can slip to Phase 6).**
      - Render a quote card as **SVG/Canvas from the post's own text** — typography
        and data, not a generated illustration.
      - **Do not add generic AI image generation.** Glossy AI art reads as "bot"
        on X and undoes the work `humanize.ts` does on the text.

### Tests

- [ ] **New:** `scripts/best-times-smoke.mts` — a synthetic outcome set with a
      known peak returns that peak; a sparse set (< 14 days) returns the fallback
      and flags itself as not personalised.
- [ ] **New:** `scripts/trust-smoke.mts` — 20 clean approvals trip the offer; an
      edit at #19 resets to 0; trust never enables itself without an explicit yes.
- [ ] Extend `schedule-smoke.mts` for auto-scheduled drafts.
- [ ] All 12 suites green.

### Manual QA

- [ ] With auto-posting on and no manual input, a draft appears in the week strip
      within 24h and publishes at its slot.
- [ ] Kill the browser mid-publish → the post is marked `failed`, **not**
      double-posted (verify on the real timeline).
- [ ] A post with an image that fails to attach is **not** published.
- [ ] Approve 20 replies with no edits → the graduation offer appears. Decline it
      → nothing changes. Edit one → streak resets.

### Done when

- [ ] Seven consecutive days of hands-off operation produce ≥ 7 published posts,
      zero duplicates, zero posts missing their intended image.
- [ ] All 12 suites green. Version `2.4.0`. Committed. Logged in §10.

---

## PHASE 4 — Mentions, notifications, weekly email

> **Goal:** Answer the people who talk to you.
> **Depends on:** Phase 2 (the panel surfaces mentions).
> **Context:** This is the highest-value, lowest-risk automation in the product
> and it is currently 100% absent (**D15**). Replying to your own mentions carries
> no ban risk — it is what the notifications tab is for — and X weights
> conversation threads heavily.

### Steps

- [ ] **4.1 — Read the notifications tab.**
      - Add selectors for `x.com/notifications` and the Mentions sub-tab to
        `selectors.ts` (and the server-side override map in
        `server/src/config/selectors.ts`, so a DOM change is a deploy not a review).
      - New scan task `scan-mentions` in `scheduler/types.ts`, on a ~10 min interval.
      - Parse: who, what they said, which of the user's posts it replies to, when.

- [ ] **4.2 — Draft replies to mentions.**
      - Route through the existing `DRAFT_COMMENT` path with added thread context.
      - Prioritise by follower count and recency — a big account asking a question
        decays fastest.
      - Respect approval/trust settings exactly as feed replies do.

- [ ] **4.3 — Browser notifications.**
      - Add `"notifications"` to `permissions`.
      - **Capped at 1–2/day.** Off by default for everything except "something is broken".
      - Reserved for decaying moments only:
        *"@someone with 40k followers just replied to you. Want me to answer?"*
        *"I've been signed out of X for 2 hours — nothing's running."*

- [ ] **4.4 — Weekly email.**
      - New `server/src/jobs/weekly-summary.ts`, modelled on the existing
        `daily-summary.ts` (reuse its timezone bucketing and its
        claim-before-send dedup — that pattern is correct, do not reinvent it).
      - Content: followers gained vs last week · which target worked best ·
        which target was dropped and why · a timing change made · and the closing
        line **"Nothing needs doing. I'll keep going."**
      - Honour the existing unsubscribe route.

- [ ] **4.5 — Reframe the daily email.**
      Lead with followers gained and the single best-performing reply. Action
      counts move below the fold.

### Tests

- [ ] **New:** `scripts/mentions-smoke.mts` — parsing fixtures for the mention
      shapes X renders (reply-to-your-post, plain @mention, quote of your post);
      prioritisation ordering; dedup so a mention is never drafted twice.
- [ ] **Server:** weekly-summary dedup test mirroring the daily one — two
      concurrent runners send exactly one email.
- [ ] All 13 suites green; server tests green.

### Manual QA

- [ ] Reply to the test account from a second account → within 10 minutes a draft
      exists, and it references what was actually said.
- [ ] Confirm no more than 2 browser notifications in a 24h period.
- [ ] Trigger the weekly email manually; verify every number in it against the DB.

### Done when

- [ ] Every mention in a 48h window is either answered or has a draft waiting.
- [ ] Zero duplicate emails across two concurrent job runs.
- [ ] All 13 suites green. Version `2.5.0`. Committed. Logged in §10.

---

## PHASE 5 — Growth analytics and Ask

> **Goal:** Answer *why*, and let the user just say what they want.
> **Depends on:** Phases 1–4, **plus 2–4 weeks of accumulated real data.** Do not
> start 5.2 before there is enough history for the copilot to say true things
> rather than plausible ones.

### Steps

- [ ] **5.1 — Growth tab, rebuilt.**
      - Followers over time with **change markers** (preset switched, target added,
        auto-posting started) read from the action log.
      - **Where followers came from** — replies vs posts vs follow-backs, using the
        existing `followedBack` / `followedBackSample` attribution primitive, which
        is currently computed and almost entirely unused.
      - **Which targets are working** — one row per creator: replies sent, views
        earned, followers gained. Dead ones flagged with a `Drop` button in the row.
      - **Which topics are working** — the same, per keyword.
      - **Best times** heatmap from 3.1.
      - **Best posts** with `Write more like this`.
      - Every row actionable in place.

- [ ] **5.2 — Ask (the copilot).**
      - New server route `POST /api/ask`, OpenAI function-calling.
      - Model: `gpt-5.5` for reasoning turns, `gpt-5.4-mini` for cheap ones.
        (Note: `CONTEXT.md` §6 still says `gpt-4o-mini` — that document is stale
        relative to the code, which already uses the 5.x models. See §9.)
      - Tools: `get_growth`, `get_action_log`, `update_settings`, `add_target`,
        `remove_target`, `draft_post`, `schedule_post`, `explain_action`, `run_dry_run`.
      - **The four rules, enforced in code, not prompt:**
        1. Every mutation returns a **diff** the UI renders as
           `Do it` / `Not now`. Never applied silently.
        2. Settings apply instantly **with undo**. Anything that posts publicly
           **always** asks first, regardless of trust level.
        3. When it cannot answer from real data it says so. **Never fabricate a
           number** — a wrong figure destroys trust permanently.
        4. Standing instructions ("never reply to crypto posts") persist to a
           `Things you've told me` list the user can edit.

- [ ] **5.3 — Ask in the floating panel.**
      Short answers inline; anything needing a table or chart offers
      *"that's easier to read in the sidebar — open it?"*

### Tests

- [ ] **New:** `scripts/ask-tools-smoke.mts` — every tool's argument schema
      validates; a mutation tool **always** returns a diff and never applies
      directly; a publish-shaped tool always requires confirmation.
- [ ] **New:** `scripts/attribution-smoke.mts` — a fixture of snapshots + follows
      produces the expected followers-from-follows figure, and returns `null`
      rather than guessing when the sample is missing.
- [ ] All 15 suites green.

### Manual QA

- [ ] Run all eight canonical phrasings from the design brief (`post more`,
      `why did I lose followers yesterday?`, `stop following people`, …). Each
      produces the right action or an honest "I don't know".
- [ ] Ask a question the data cannot answer → it says so. It must not invent.
- [ ] Every settings change offers undo, and undo actually reverts.

### Done when

- [ ] All 8 phrasings behave correctly.
- [ ] Zero fabricated figures across 20 varied questions.
- [ ] All 15 suites green. Version `2.6.0`. Committed. Logged in §10.

---

## PHASE 6 — The learning loop

> **Goal:** Make it feel alive — it notices things and comes to ask.
> **Depends on:** Phase 5.

### Steps

- [ ] **6.1 — Weekly auto-tune.** Drop targets with no attributed followers over
      3 weeks; promote ones that work; shift budget between replying and posting
      based on which is currently producing; move posting times toward measured peaks.
      **Every change is logged and reversible**, and named in the weekly email.
- [ ] **6.2 — Proactive questions in Ask**, built from data already collected:
      - *"Your Tuesday post did 4× your usual… more in that direction?"*
      - *"Three of five targets produced nothing in three weeks. Swap them?"*
      - *"You've edited my last 6 replies to make them shorter. Write shorter?"*
- [ ] **6.3 — Voice tuning from edits.** Feed accumulated `(generated, corrected)`
      pairs back into the voice profile.
- [ ] **6.4 — Media-aware reading.** Fixes **D4** and **D5**.
      - Add `tweetPhoto`, `videoPlayer`, `card.wrapper` selectors.
      - Read image `alt` text and card titles into `meta.text`.
      - Click "Show more" before capturing.
      - Read the quoted tweet's text as context.
      - Relax relevance for media: a post whose **author** is a target, or whose
        alt/card text matches, counts as relevant even with a thin caption.
- [ ] **6.5 — Follow quality filter.** Fixes **D9**. Read the bio already present
      in the `UserCell`; filter on keyword match, follower count band, and recent
      activity before following. Add auto-unfollow of non-followers after 14 days.
- [ ] **6.6 — Whitelist in every follow path.** Fixes **D7**. Add a whitelist
      field to `HomeAutopilotOptions` and honour it in home, search and profile
      autopilot — not just `runInlineFollowList`.
- [ ] **6.7 — Decouple topic feeds from home-feed toggles.** Fixes **D8**. Give
      search feeds their own action toggles and their own budget check.
- [ ] **6.8 — Language-agnostic reply detection.** Fixes **D10**. Detect replies
      structurally (the in-reply-to affordance) rather than by matching English text.
- [ ] **6.9 — Enforce or delete the dead free-tier flags.** Fixes **D11**.

### Tests

- [ ] **New:** `scripts/media-read-smoke.mts` — DOM fixtures for
      video-no-caption, image-with-alt, card-with-title, truncated "Show more",
      and quoted-tweet. Each yields non-empty, correct `meta.text`.
- [ ] **New:** `scripts/follow-filter-smoke.mts` — bio/follower/activity filtering
      and whitelist exclusion across **all** follow paths.
- [ ] Extend `relevance-smoke.mts` with the media-relevance relaxation.
- [ ] All 17 suites green.

### Done when

- [ ] A captionless video post from a target creator is engaged, not skipped.
- [ ] A whitelisted handle is never followed from **any** path.
- [ ] All 17 suites green. Version `3.0.0`. Committed. Logged in §10.

---

## 7. Global regression checklist

Run before **every** version bump, not just at the end.

- [ ] `pnpm typecheck` clean across all workspaces
- [ ] `pnpm --filter @casper/extension test` — all suites green
- [ ] `pnpm build` succeeds for every workspace
- [ ] Load unpacked on a **fresh** Chrome profile; sign up as a new user; complete
      setup; confirm the engine performs a real action within 5 minutes
- [ ] Pause via the toolbar `⏸` → all activity stops **within one tick**
- [ ] Daily caps are respected (compare the action log against `effectiveCap`)
- [ ] No consecutive actions closer than 8 seconds
- [ ] Free-tier account blocks at 50 monthly actions with the correct upgrade card
- [ ] Pro account is unrestricted
- [ ] Sign out of X mid-session → the correct card appears, nothing crashes
- [ ] Break a selector deliberately → degraded streak trips the breaker → the
      correct card appears → nothing is posted blindly
- [ ] `chrome://extensions` shows **zero** errors on the extension card
- [ ] No `console.log` in committed code except the deliberate service-worker
      diagnostics (per `CONTEXT.md` §12)

---

## 8. Risks and standing decisions

| Risk | Decision |
|---|---|
| Auto-posting will eventually publish something the user dislikes | Graduated trust (3.3). Never default-on. Every post reversible. |
| Making the engine more visible tempts making it more aggressive | Phase 0 is a hard prerequisite. Never raise caps to make a demo look better. |
| Shadow DOM style bleed onto x.com | Non-negotiable requirement in 2.1. QA in both X themes. |
| `chrome.sidePanel.open()` gesture requirement | Prototype 2.5 **first**. Documented `chrome.commands` fallback. |
| AI-generated images read as "bot" and undo the humanizer | Quote cards are SVG/Canvas typography and data only. No generic AI art. |
| The browser must be open for anything to run | This is also the product's core safety claim (a real session, not a headless server). Be honest about it in marketing; do not engineer it away. |
| X changes its DOM | Server-side selector overrides already exist. Extend them for every new selector added in Phases 4 and 6. |

---

## 9. Documentation debt to clear

`CONTEXT.md` is stale relative to the code. Fix as part of Phase 1:

- [ ] §6 / §14 say `gpt-4o-mini`; the code uses `gpt-5.5` and `gpt-5.4-mini`.
- [ ] §14 says "Casper AI" and "Twitter & LinkedIn"; the product is Ghostly247
      and LinkedIn automation was removed.
- [ ] §4 promises "Niche templates"; never built — Phase 1.4 step 1 supersedes them.
- [ ] §5 promises "follow by bio keyword", "auto-unfollow non-followers" and
      "burst mode"; the first two arrive in 6.5, burst mode is unscheduled.
- [ ] §11 phasing is superseded by this file. Point it here.
- [ ] `docs/Ghostly247-Five-Features.pdf` repeats the 8–45s claim — true only
      after Phase 0.1. Do not re-publish it before then.

---

## 10. Progress log

Append one line per completed step. Never edit or delete earlier lines.

| Date | Step | Commit | Notes |
|---|---|---|---|
| 2026-09-10 | **0.6** Block reasons | `5407c34` | New `scheduler/block-reason.ts` — pure `resolveBlockReason` + 11-code precedence table + persistence. Wired into 4 sites in `scheduler.ts`: paused, free-cap, caps-spent, and the idle branch that replaced the `console.log` at the old line 209. Cleared on every dispatch. `STORAGE_KEYS.blockReason` added. `DEGRADED_STREAK_LIMIT` set to **4** to match `DEGRADED_LIMIT` in scheduler.ts. |
| 2026-09-10 | **0.6 test** | `5407c34` | `scripts/block-reason-smoke.mts`, 25 assertions, registered in the `test` script. Full suite: 7 suites / 175 assertions green. |
| 2026-09-10 | **2.5** Spike | `d5cdd1f` | Additive only — popup untouched. Added `sidePanel` permission + `side_panel.default_path`, `src/sidepanel/{index.html,spike.ts}`, vite input, `OPEN_SIDE_PANEL` handled synchronously in the `onMessage` listener (never after an `await`, which would drop the gesture), and a dashed spike button on x.com via `content/side-panel-spike.ts`. **RESULT: not yet verified — needs a human in Chrome.** |
| 2026-09-10 | **0.1** Action delay | `f9d13f4` | `ACTION_DELAY_MS = { min: 8_000, max: 45_000 }` added to `scheduler/timegate.ts` as the single source; `nextActionDelayMs()` now derives from it. Both hardcoded `3_000/7_000` sites in `executor.ts` (FOLLOW_BACK payload, RUN_HOME payload) read it. `autopilot.ts:612` untouched — it already reads `opts`. **D1 + D13 closed.** `CONTEXT.md` §10's ⚠️ annotation replaced with a statement that the claim is now true; `docs/Ghostly247-Five-Features.pdf` is safe to re-publish. |
| 2026-09-10 | **0.1 test** | `f9d13f4` | `scripts/pacing-smoke.mts` started (6 assertions: range bounds, not inverted, 2,000 draws of `nextActionDelayMs()` stay inside the range and actually vary). Registered in the `test` script. Full suite: 8 suites green. The 0.2–0.4 assertion groups get appended to this same file. |
| 2026-09-10 | **0.2** Hourly ceiling | `fc17f57` | New `scheduler/rate-limit.ts`: rolling 60-min window in `chrome.storage.local` (`STORAGE_KEYS.rateWindow`), pure maths + persisted `*Now` helpers, `HOURLY_CEILINGS` already keyed for the Phase 1.3 presets (careful 12 / balanced 30 / growth 60), defaulting to **30/h**. Fed from `counters.ts` `incrementCounter` — the one choke point both the RECORD_ACTION path and the queued-task path pass through, so no action can skip the window. Gated in `autopilot.ts` before **each** of like / bookmark / quote / repost / posted-reply / follow; when the ceiling is hit the loop **waits** in ≤15s chunks (kill switch + deadline stay responsive) instead of exiting. Approval-mode drafting is not gated — it types nothing into X. The bonus like inside a profile visit now requires 2 free slots, since it rides one gate. **D2 closed.** |
| 2026-09-10 | **0.2 test** | `fc17f57` | `pacing-smoke.mts` +23 assertions: 30-in-an-hour blocks, the window rolls (not a clock-hour reset), a 3-second burst still blocks a minute later, `msUntilNextSlot` measures from the oldest action, and lowering the ceiling mid-hour lengthens the wait rather than breaking it. 8 suites green, typecheck + build clean. |
| 2026-09-10 | **0.3** Unknown age | `d30c8a2` | `ageMultiplier(null)` returns **0.5**, not 1.0, and negatives with it; comment rewritten to say why (the field is optional, so unknown was the common case and it granted full caps to the youngest accounts). `Dashboard.tsx:769`'s "Leave blank if unsure" now reads "Left blank, I assume new and go at half pace" — the copy was half of D3. **D3 closed.** |
| 2026-09-10 | **0.3 test** | `d30c8a2` | `scheduler-smoke.mts:56` asserted `ageMultiplier(null) === 1.0` — that assertion encoded the defect, so it now expects 0.5, with a note saying so, plus a `computeDailyCaps(base, null)` case. `pacing-smoke.mts` +6 assertions (the four the plan lists, plus negative-age and unknown-equals-brand-new). 8 suites green, typecheck clean. |
| 2026-09-10 | **0.4** Active hours | `58da613` | `isWithinActiveHours` now runs as **gate 2** in `handleTick`, immediately after the paused gate and before the session clock starts — so scans stop too, per the header's "scans pass 2–4, not 6". Writes `outside-hours` via `setBlockReason` (with the window and tz as detail) and calls `stopKeepAlive()`. Deliberately **not** `appendDiagnostic`: the tick fires every 30s and a nightly diagnostic per tick would evict everything else from the buffer; the block reason carries `since`, which is what the UI needs. **D6 closed.** ⚠️ **Behaviour change with no UI yet:** `DEFAULT_SETTINGS.activeHours` is 09:00–22:00 local, so existing users now sleep 22:00–09:00 and there is no control to change it until Phase 1.6's ⚙ Settings page. Conservative by design, but it needs saying. |
| 2026-09-10 | **0.4 test** | `58da613` | `pacing-smoke.mts` +16 assertions: half-open window (active at start hour, asleep at end hour), paused beats the clock in and out of the window, the overnight 22→6 case at 23:00/00:30/05:30 vs 06:30/noon, and an unparseable timezone falling back to UTC instead of throwing the gate open. 8 suites green, typecheck clean. |
| 2026-09-10 | **0.5** Scroll + dwell | `4ae07e6` | New `platforms/common/pacing.ts` (pure, DOM-free, so it is testable): `SCROLL_DISTANCE_PX` 400–1100, `SCROLL_PAUSE_MS` 400–1400, `readDwellMs` at 4 words/second with a 1.5s floor, 12s cap and ±15% jitter. The autopilot's fixed `smoothScrollBy(700)` / `wait(650)` now draw fresh each pass, and every post that clears the freshness / own-post / reply filters gets a read dwell **before** the relevance decision — so posts it skips cost attention too, which is the half that makes the rhythm human. `autopilot.ts`'s local `randomInt` deleted in favour of the shared one. |
| 2026-09-10 | **0.5 test** | `4ae07e6` | `pacing-smoke.mts` +16 assertions: 2,000 draws stay in range and produce >100 distinct scroll distances (not a metronome); dwell floor/cap/proportionality pinned with `jitter = 1`; jitter varies the dwell without escaping the clamp. 8 suites green, typecheck + build clean. |
| 2026-09-10 | **0.7** Gate header | `f3dc758` | `scheduler.ts:1-17` rewritten against the code: adds gate 0 (publishing / growth / scheduled posts, which run whether or not the engine is armed), 2a (session auto-pause), the free-tier half of gate 6, and the block-reason writes at 5/6/7. Gate 2 is annotated as having been documented-but-absent until 0.4. **Gate 8 now says what it is not:** it paces QUEUED-task dispatch, not the actions X sees — in-session pacing is the same `ACTION_DELAY_MS` range slept in the content script, bounded by the hourly ceiling the tick knows nothing about. |
| 2026-09-10 | **Phase 0 tests** | `9c58138` | Phase-level Tests checklist ticked: `pacing-smoke.mts` complete at **63 assertions**, registered, suite green at **8 suites / 239 assertions**, typecheck + build clean. Manual QA left entirely unchecked — it needs a human in Chrome. Two “Done when” rows (ten timed live actions; `blockReason` observed for 3 conditions) left unchecked for the same reason. **Phase 0 is code-complete and blocked there; Phase 1 does not start until those pass.** |
| 2026-09-10 | **1.1** Manifest wiring | `dc6d6e7` | `action.default_popup` **removed** — the toolbar icon now opens the side panel via `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, installed from `onInstalled`, `onStartup` and SW boot (some lifecycles skip `onInstalled`, same reason `installScheduler` is called twice) and wrapped so an older Chrome logs instead of taking the worker down. `sidePanel` permission, `side_panel.default_path` and the vite `sidepanel` input already existed from the 2.5 spike, so this step only had to remove the popup route. `src/popup/` stays on disk until 1.6. Built `dist/manifest.json` verified: no `default_popup`, `side_panel` present. |
| 2026-09-10 | **1.2** App shell | `_(this commit)_` | `src/popup/styles.css` -> **`src/ui/theme.css`** (git mv, so history follows) plus the three semantic tokens from §3 (`working` #3fbf87, `attention` #e6a53a; coral already existed) and a note that there is deliberately no destructive red. New **`src/ui/`**: `Panel` (its body is the only scroll container — Phase 2's brief needs the bars pinned), `TopBar` (generic action list, so Phase 2's eye/pause/expand/close toolbar reuses it), `TabBar`, `StatusBar`, `Card`, `Button` (destructive = solid coral fill, never a second red), `Stat`, `PaceBar`, `FeedLine`, `EmptyState`, `index.ts`. New `src/sidepanel/{index.html,main.tsx,App.tsx,useEngineStatus.ts}` and `pages/{Today,Review,Posts,Growth,Ask,Account,Settings}.tsx`. The 2.5 spike page is **replaced** by the real shell (`spike.ts` deleted); the x.com spike button still sends `OPEN_SIDE_PANEL`, so the gesture question is unchanged. |
| 2026-09-10 | **1.2** notes | `_(this commit)_` | `useEngineStatus` reads settings/counters/blockReason straight from `chrome.storage.local` and subscribes to `onChanged` — no polling, and a like landing in a content script updates the bar. Pace = actions today over the sum of today's `effectiveCap`. Status-bar reason strings are the ONE-LINE version; **1.7 owns the card copy** and wins if they disagree. Placeholders are honest: no fake numbers, no fake feed, and `Ask` says it arrives in Phase 5 as the plan demands. Signed-out still renders the popup's `LoggedOut` (1.6 moves it) rather than duplicating it. |
| 2026-09-10 | **§9** Doc debt | `_(this commit)_` | `CONTEXT.md` §6 rewritten to the real 5.x models + API gotchas; §4/§5 flag never-built features; §11 marked superseded and points here; §14 corrected (Ghostly247, X-only, current state). §10's "8–45 seconds" annotated as **not yet true** with a do-not-republish warning on the PDF. |
