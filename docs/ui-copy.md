# UI copy — the "needs you" states

> Source of truth for every string the user reads when Ghostly247 isn't working,
> or when it needs a decision. Referenced by `updateplan.md` step **1.7**.
>
> **This copy is fixed. Do not improvise, reword, or "improve" it.** It was
> written against the specific failure it describes. If a string reads wrong to
> you, raise it — don't silently rewrite it.

---

## The rules these strings follow

1. **Name the real thing, in present tense.** "Reading @levelsio's new post" —
   not "3 pending · 12 done · 0 failed".
2. **Never show a blocked state without the button that unblocks it.** The two
   exceptions below are marked, and both are states where there is genuinely
   nothing for the user to do.
3. **One card at a time.** Never a list of six problems. Precedence decides which
   one shows — for the engine states that's `BLOCK_REASON_PRECEDENCE` in
   `scheduler/block-reason.ts`; for the mix of engine and notice states, see
   "Which card wins" at the bottom.
4. **No apologies, no jargon, no exclamation marks.** The product is a calm
   colleague, not an alarm.
5. **First person.** Ghostly says "I", because the whole design is a colleague
   rather than a control panel.

---

## A. Engine states (11) — driven by `casper.blockReason`

These come straight from `resolveBlockReason` in `scheduler/block-reason.ts`.
The `code` column is the `BlockReasonCode` — match on it exactly.

| # | `code` | Title | Body | Button | Tone |
|---|---|---|---|---|---|
| 1 | `not-configured` | **I don't know who to watch yet.** | Give me a topic and I'll start today. | `Set me up` | attention |
| 2 | `feed-off` | **Your {n} topics aren't running.** | Turn on engagement and I'll start working them. | `Turn it on` | attention |
| 3 | `caps-spent` | **Done for today.** | I've used today's safe limit — back at {resumeTime}. | *(none)* | calm |
| 4 | `outside-hours` | **Resting until {startHour}.** | Running at 4am is the most machine-like thing there is. | `Change hours` | calm |
| 5 | `signed-out` | **I can't see your account.** | Sign in to X and I'll pick straight back up. | `Open X` | attention |
| 6 | `free-cap` | **You've used your {n} free actions this month.** | They reset on the 1st — or invite a friend from Settings and you both get 10 more. | `See plans` | calm |
| 7 | `sub-lapsed` | **Your plan ended, so I've stopped.** | Everything's saved — nothing's lost. | `Restart it` | attention |
| 8 | `degraded` | **X changed something and I can't read the feed.** | I've stopped rather than guess. I'll retry automatically. | `Tell us` | attention |
| 9 | `server-unreachable` | **Can't reach Ghostly — replies are paused.** | Likes and follows are still running. | *(none)* | calm |
| 10 | `paused` | **Resting.** | Nothing's running. | `Start` | calm |
| 11 | `nothing-matched` | **Skipped {n} posts — nothing matched your topics.** | Feed's quiet right now. | `Widen my topics` | calm |

### Notes on the engine states

- **#3 `caps-spent`** — `{resumeTime}` is the user's `activeHours.startHour`
  formatted in their own timezone ("9am"). Caps and active hours reset together,
  so one time covers both.
- **#4 `outside-hours`** — this is a *calm* state, not a problem. Do not style it
  as a warning. The button goes to the active-hours setting.
- **#9 `server-unreachable`** — deliberately has **no button**; there is nothing
  the user can do, and offering a fake "Retry" would be worse than silence. The
  second line matters: it tells them the engine is still half-working, which is
  true and stops a support ticket.
- **#11 `nothing-matched`** — **this is not a fault.** Style it like a normal
  status line, never like an error. This single string is the difference between
  a quiet colleague and a dead one, which is the whole reason `block-reason.ts`
  exists.

---

## B. Notice states (4) — NOT from `blockReason`

**These four are the ones step 1.7 originally got wrong.** They are not reasons
the engine is idle — the engine may be running perfectly while any of them is
true. Each has its own source, listed below. Do not try to force them into
`BlockReasonCode`.

| # | State | Source of truth | Title | Body | Button |
|---|---|---|---|---|---|
| 12 | Drafts waiting | count of pending replies (`getPendingReplies`) | **{n} replies ready for you.** | *(none — the count is the message)* | `Review them` |
| 13 | Profile gone quiet | newest `postedAt` in scheduled posts, vs now | **Your profile's gone quiet.** | I sent {n} people there this week. Want me to write something? | `Write two for me` |
| 14 | Post failed to publish | a scheduled post with `status: 'failed'` | **{weekday}'s post didn't go out** — the browser restarted mid-publish. | Nothing was double-posted. | `Try again` |
| 15 | Image wouldn't attach | a failed post whose `error` mentions the image | **I didn't post it** — the image wouldn't attach. | I won't send it without one. | `Post without image` · `Retry` |

### Notes on the notice states

- **#13** is the card that connects the two halves of the product — it's the one
  that turns "the bot replies for me" into "the bot also fills my profile". Show
  it when nothing has published in **5 days or more**. `{n}` is profile visits
  this week if we have the figure; if we don't, drop the sentence entirely rather
  than guessing a number.
- **#14** — the "nothing was double-posted" line is not filler. It is the exact
  fear a user has when they see "failed", and answering it before they ask is
  what makes the product feel safe. `{weekday}` is the post's scheduled day.
- **#15** is the only two-button card in the set. It exists because `compose.ts`
  deliberately refuses to publish a post whose image didn't attach — the user
  needs to be told that was a *choice*, not a crash.

---

## Which card wins

Two separate questions, in this order:

1. **Is there an engine state?** If `casper.blockReason` is set, that card shows,
   using `BLOCK_REASON_PRECEDENCE` to pick between simultaneous reasons. The
   engine being unable to work beats any notice.
2. **Otherwise, show at most one notice**, in this order:
   `post-failed` → `image-failed` → `drafts-waiting` → `profile-quiet`.
   Failures first because they're already broken; the nudge last because it can
   wait a day.

**Never render two cards.** If you have both an engine state and a notice, the
engine state wins and the notice waits.

The one exception: `paused` is a state the user chose. A notice may show
alongside it — someone who paused the engine can still have drafts to review.

---

## Where these appear

The same copy, the same components, in both modes:

- **Floating panel** — the "Now" tab, under the live status line.
- **Side panel** — the "Today" page, under the live status line.

The floating panel is narrower, so the body may wrap to three lines there. That's
fine; don't write a shorter variant for it. One string, both places.
