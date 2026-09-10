import type { ActiveHours, SafetyPresetName } from './settings.js';

/**
 * Ask — the copilot (updateplan 5.2).
 *
 * The server has no access to `chrome.storage.local` (there is no server-
 * authoritative settings migration — see updateplan §1), so every request
 * carries a compact snapshot of the settings the model needs to reason about
 * targets/topics/pace. Growth and action-log data, by contrast, ARE server-
 * side already, so those tools execute directly against the database.
 */
export interface AskContext {
  targets: string[];
  topics: string[];
  searchQueries: string[];
  safetyPreset: SafetyPresetName;
  activeHours: ActiveHours;
  isPaused: boolean;
  autoPostEnabled: boolean;
  /** "Things you've told me" — standing instructions the user can edit,
   *  always sent so the model honours them without being asked again. */
  standingInstructions: string[];
}

export interface AskChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Tools whose effect reaches outside the conversation. NEVER executed by the
 * server — every one of these always comes back as a `diff` for the
 * extension to apply (or not) after the user says "Do it" (rule 1 in the
 * plan, enforced in code via this list, not by trusting the model to ask).
 */
export const ASK_MUTATING_TOOLS = [
  'update_settings',
  'add_target',
  'remove_target',
  'draft_post',
  'schedule_post',
  'remember_instruction',
  'forget_instruction',
] as const;
export type AskMutatingTool = (typeof ASK_MUTATING_TOOLS)[number];

/** Needs the live browser (a real X tab) — the server cannot run it, so it
 *  comes back as a client action rather than a tool result. Not a mutation:
 *  a dry run touches nothing, so it doesn't need a "Do it" confirmation, just
 *  the extension's own UI to run it and show what came back. */
export const ASK_CLIENT_TOOLS = ['run_dry_run'] as const;
export type AskClientTool = (typeof ASK_CLIENT_TOOLS)[number];

/** Read-only — safe for the server to execute directly against the DB. */
export const ASK_READ_TOOLS = ['get_growth', 'get_action_log', 'explain_action'] as const;
export type AskReadTool = (typeof ASK_READ_TOOLS)[number];

export interface AskDiff {
  tool: AskMutatingTool;
  args: Record<string, unknown>;
  /** Plain-English statement of exactly what will happen — required from the
   *  model on every mutating tool call, never synthesised after the fact, so
   *  there's no gap between what's shown and what "Do it" would apply. */
  summary: string;
}

export type AskResult =
  | { type: 'answer'; text: string }
  | { type: 'diff'; diff: AskDiff }
  | { type: 'client_action'; action: AskClientTool; summary: string }
  /** The model could not answer honestly from real data (rule 3) — never a
   *  free-associated guess dressed up as an answer. */
  | { type: 'unknown'; text: string };

export const ASK_LIMITS = {
  maxMessageChars: 2_000,
  maxHistoryTurns: 12,
  /** Read-tool round trips per request, so a confused loop can't run away. */
  maxToolRounds: 4,
} as const;
