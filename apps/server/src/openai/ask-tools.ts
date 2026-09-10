/**
 * Ask's tool definitions and the diff-gating logic (updateplan 5.2).
 *
 * Pure and Express-free on purpose: `isMutating`/`isClientTool` decide
 * whether a tool call gets executed or turned into a proposal, and that
 * decision has to be testable without a running server or an OpenAI key —
 * see `scripts/ask-tools-smoke.mts`.
 */
import type OpenAI from 'openai';
import { ASK_MUTATING_TOOLS, ASK_CLIENT_TOOLS } from '@casper/shared';
import type { AskContext, AskMutatingTool, AskClientTool } from '@casper/shared';

export type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export const READ_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_growth',
      description:
        "This user's real follower history, engagement sources, and per-target/per-topic performance. Call this before stating any growth, follower, or engagement figure — never state one from memory or a guess.",
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of follower history to include (default 30, max 90).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_action_log',
      description:
        'Recent real actions (likes, replies, follows) the engine has taken, with what each one was and why. Call this before answering any question about what the engine did or is doing.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max entries (default 30, max 100).' },
          actionType: {
            type: 'string',
            enum: ['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_action',
      description:
        "Why the engine acted on a specific handle or post — which keyword or target rule matched. Use this for 'why did you...' questions about one specific handle.",
      parameters: {
        type: 'object',
        properties: {
          targetHandle: { type: 'string', description: 'The @handle in question, without the @.' },
        },
        required: ['targetHandle'],
      },
    },
  },
];

const summaryProp = {
  summary: {
    type: 'string',
    description:
      "The EXACT plain-English statement of what this will do, shown to the user next to 'Do it' / 'Not now'. Be specific and concrete — this is the only description they see before deciding.",
  },
} as const;

export const MUTATING_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'update_settings',
      description:
        'Propose a settings change: safety preset, pause state, skip-buried-replies, or auto-posting on/off. Settings apply instantly with undo once the user says yes — never applied without asking, regardless of trust level.',
      parameters: {
        type: 'object',
        properties: {
          safetyPreset: { type: 'string', enum: ['careful', 'balanced', 'growth'] },
          isPaused: { type: 'boolean' },
          skipReplies: { type: 'boolean' },
          autoPostEnabled: { type: 'boolean' },
          ...summaryProp,
        },
        required: ['summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_target',
      description: 'Propose adding a target creator to watch.',
      parameters: {
        type: 'object',
        properties: {
          handle: { type: 'string', description: 'Bare handle, no @.' },
          reason: { type: 'string' },
          ...summaryProp,
        },
        required: ['handle', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_target',
      description: 'Propose dropping a target creator.',
      parameters: {
        type: 'object',
        properties: { handle: { type: 'string' }, ...summaryProp },
        required: ['handle', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_post',
      description:
        "Write a new post draft from a short description, in the user's own voice. Publishing anything is a separate, always-confirmed step — this only proposes a draft to review.",
      parameters: {
        type: 'object',
        properties: { description: { type: 'string' }, ...summaryProp },
        required: ['description', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_post',
      description:
        "Propose scheduling a specific piece of post text at a time. Always confirmed first, regardless of trust level — this publishes publicly under the user's name.",
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          atIso: { type: 'string', description: 'ISO timestamp to publish at.' },
          ...summaryProp,
        },
        required: ['text', 'atIso', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember_instruction',
      description:
        'Propose adding a standing instruction to "Things you\'ve told me" (e.g. "never reply to crypto posts") — persists and is honoured on every future turn once the user confirms.',
      parameters: {
        type: 'object',
        properties: { instruction: { type: 'string' }, ...summaryProp },
        required: ['instruction', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'forget_instruction',
      description: 'Propose removing a standing instruction the user previously gave.',
      parameters: {
        type: 'object',
        properties: { instruction: { type: 'string' }, ...summaryProp },
        required: ['instruction', 'summary'],
      },
    },
  },
];

export const CLIENT_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'run_dry_run',
      description:
        'Run a live dry run of the home feed in the browser (what it WOULD engage, nothing actually posted). Needs the real browser, so it never runs on the server — offer this when the user wants to see what would happen without committing to anything.',
      parameters: { type: 'object', properties: { ...summaryProp }, required: ['summary'] },
    },
  },
];

export const ALL_TOOLS: Tool[] = [...READ_TOOLS, ...MUTATING_TOOLS, ...CLIENT_TOOLS];

/**
 * Every mutating/client tool must require `summary` in its own schema — the
 * "Do it" card has nothing else to show the user, so a tool that could skip
 * it would silently ask for trust the UI can't back up. Checked once here
 * rather than trusted per-tool, so a new tool added later can't quietly
 * forget it.
 */
export const requiresSummary = (tool: Tool): boolean => {
  const params = tool.function.parameters as { required?: unknown[] } | undefined;
  return Array.isArray(params?.required) && params.required.includes('summary');
};

export const isMutating = (name: string): name is AskMutatingTool =>
  (ASK_MUTATING_TOOLS as readonly string[]).includes(name);
export const isClientTool = (name: string): name is AskClientTool =>
  (ASK_CLIENT_TOOLS as readonly string[]).includes(name);
/** Read tools are everything else — explicit rather than "not mutating and
 *  not client", so a typo'd tool name fails closed (treated as unknown, not
 *  silently executed as a read). */
export const isReadTool = (name: string): boolean => READ_TOOLS.some((t) => t.function.name === name);

export const systemPrompt = (context: AskContext): string => `You are Ghostly247's in-product copilot, embedded in a Chrome extension that grows an X (Twitter) account autonomously. You are talking directly to the account owner.

The four rules you must follow, no exceptions:
1. Any tool that changes something (settings, targets, a post, a standing instruction) is a PROPOSAL, never applied by you. Call the tool; the app shows the user "Do it" / "Not now" before anything happens. You will never see the outcome of that choice in this turn.
2. A tool that would publish something publicly (schedule_post) or run in the real browser (run_dry_run) always requires the user's confirmation too, regardless of how much they've approved before.
3. NEVER state a number, a trend, or a fact about this account that didn't come from a tool result in this conversation. If you don't have the data, say so plainly — "I don't have that" is always better than a plausible-sounding guess. A wrong figure destroys trust permanently.
4. The user's standing instructions below are binding. Honour them without being asked again.

Current setup:
- Targets watched: ${context.targets.length ? context.targets.join(', ') : '(none)'}
- Home-feed topics: ${context.topics.length ? context.topics.join(', ') : '(none)'}
- Search feeds: ${context.searchQueries.length ? context.searchQueries.join(', ') : '(none)'}
- Safety preset: ${context.safetyPreset}
- Active hours: ${context.activeHours.startHour}:00–${context.activeHours.endHour}:00
- Engine paused: ${context.isPaused ? 'yes' : 'no'}
- Auto-posting: ${context.autoPostEnabled ? 'on' : 'off'}

Things the user has told you (binding, per rule 4):
${context.standingInstructions.length ? context.standingInstructions.map((s) => `- ${s}`).join('\n') : '(none yet)'}

Be concise. Lead with the answer, not a preamble. When you're not sure whether the user wants an answer or a change, ask — don't guess and act.`;
