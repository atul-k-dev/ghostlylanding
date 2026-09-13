/**
 * Every screenshot / video the marketing site expects, in one place.
 *
 * Paths are the contract: drop a file at the path below and the section picks
 * it up. Intended dimensions are in the comment beside each entry — match the
 * aspect ratio and the layout holds; exact pixels only affect sharpness.
 *
 * Placeholders currently live at each path so the page renders. Overwrite them.
 */

export const MEDIA = {
  // ---- hero ------------------------------------------------------------
  /** 1200x1200 — the side panel, Home tab, engine Active, counters filled. */
  heroPanel: "/product/ghostly.png",

  // ---- watch it work ---------------------------------------------------
  /**
   * 1920x1080, silent, loops. Spotlight outlining posts on x.com.
   *
   * Two encodes of the same 118s source: VP9/WebM at ~8 MB for browsers that
   * take it, H.264/MP4 at ~17 MB as the fallback. The original was a 56 MB
   * 4 Mbps H.264 with a dead 2 kbps audio track — and since the player
   * autoplays, every visitor downloaded all of it.
   */
  spotlightVideoWebm: "/video/spotlight-demo.webm",
  spotlightVideo: "/video/spotlight-demo.mp4",
  /** 1920x1080 — first frame of the video above, shown before it plays. */
  spotlightPoster: "/product/spotlight-poster.png",

  // ---- three pillars ---------------------------------------------------
  /** 720x900 — feed with Spotlight outlining a post mid-action. */
  pillarEngage: "/product/foryou.png",
  /** 720x900 — Settings → Voice, showing the learned style summary. */
  pillarVoice: "/product/yourvoice.png",
  /** 720x900 — Settings → Limits, daily caps + session length. */
  pillarSafety: "/product/limit.png",

  // ---- engagement actions ----------------------------------------------
  /** 1400x900 — the activity log, mixed action types, ✓/✗ statuses. */
  activityLog: "/product/activity-log.png",

  // ---- sticky feature stack --------------------------------------------
  /** 1200x1200 — Ask tab mid-conversation with a proposal card awaiting "Do it". */
  askPanel: "/product/ask-proposal.png",
  /** 1200x1200 — Voice training result + a reply that sounds like the user. */
  voicePanel: "/product/voice-training.png",
  /** 1200x1200 — Post tab: composer with a thread and the length picker. */
  composerPanel: "/product/composer-thread.png",
  /** 1200x1200 — Settings → Sources: saved topic feeds + target creators. */
  targetingPanel: "/product/targeting-feeds.png",
  /**
   * 1200x1200 — a drafted answer to a mention, waiting for approval. Reuses the
   * review-queue shot until a dedicated capture exists (mention drafts land in
   * that same queue, so it is accurate, just not specific).
   */
  mentionsPanel: "/product/review-queue.png",

  // ---- growth ----------------------------------------------------------
  /** 1400x1000 — Growth tab: follower sparkline, deltas, best replies. */
  growthBoard: "/product/growth-scoreboard.png",

  // ---- review + email --------------------------------------------------
  /** 1000x1100 — Review tab: a queued reply beside the post it answers. */
  reviewQueue: "/product/review-queue.png",
  /** 1000x1100 — the daily recap email, as received. */
  recapEmail: "/product/daily-recap-email.png",

  // ---- how it works ----------------------------------------------------
  /** 900x700 — Chrome Web Store listing / install prompt. */
  stepInstall: "/product/step-install.png",
  /** 900x700 — onboarding: goal picker or voice training running. */
  stepSetup: "/product/step-setup.png",
  /** 900x700 — Home tab, engine Active, counters ticking. */
  stepRun: "/product/step-run.png",
} as const;
