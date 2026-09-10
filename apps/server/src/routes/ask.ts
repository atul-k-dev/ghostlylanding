/**
 * Ask — the copilot (updateplan 5.2).
 *
 * OpenAI function-calling over two kinds of tool:
 *   - READ tools (get_growth, get_action_log, explain_action) run right here,
 *     against real data, and feed their result back to the model so it can
 *     keep reasoning or answer.
 *   - Every other tool MUTATES something (a setting, a target, a post) or
 *     needs the live browser (a dry run). Neither is ever executed by the
 *     server — the loop stops the instant the model calls one, and the raw
 *     tool call comes back as a `diff` (or `client_action`) for the
 *     extension to apply, or not, after the user says "Do it". This is
 *     enforced by ASK_MUTATING_TOOLS/ASK_CLIENT_TOOLS being checked in code,
 *     not by trusting the model to ask first.
 *
 * There is no server-authoritative settings store (updateplan §1), so the
 * extension sends a compact `context` snapshot with every request — targets,
 * topics, the safety preset, active hours, standing instructions — and that
 * snapshot is what `update_settings`/`add_target`/etc reason against. Growth
 * and action-log data, by contrast, live on the server already, so those
 * tools query the database directly rather than trusting the client's word
 * for it — which is also what keeps rule 3 (never fabricate a number)
 * honest: every figure in an answer came from a real query this request
 * actually ran.
 */
import { Router } from 'express';
import { z } from 'zod';
import type OpenAI from 'openai';
import { ok, err, ASK_LIMITS } from '@casper/shared';
import type { AskResult } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { getOpenAI, hasOpenAI } from '../openai/client.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { UserModel } from '../models/user.model.js';
import { buildGrowthSummary } from './growth.js';
import { generatePostText } from '../openai/generate-post.js';
import { ALL_TOOLS, isMutating, isClientTool, systemPrompt } from '../openai/ask-tools.js';

export const askRouter = Router();

// GPT-5.5 for the reasoning turn (it decides which tools to call and reads
// the results); GPT-5.4-mini would under-think a multi-tool plan, so the
// plan's "reasoning turns" model is used throughout this route — Ask is a
// low-volume, high-stakes surface (it can propose settings/target/post
// changes), not the high-volume per-reply path 5.4-mini is for.
const MODEL = 'gpt-5.5';

const contextSchema = z.object({
  targets: z.array(z.string().max(80)).max(200).default([]),
  topics: z.array(z.string().max(80)).max(100).default([]),
  searchQueries: z.array(z.string().max(300)).max(20).default([]),
  safetyPreset: z.enum(['careful', 'balanced', 'growth']).default('balanced'),
  activeHours: z.object({ startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(0).max(23) }),
  isPaused: z.boolean(),
  autoPostEnabled: z.boolean(),
  standingInstructions: z.array(z.string().max(300)).max(50).default([]),
});

const askSchema = z.object({
  message: z.string().min(1).max(ASK_LIMITS.maxMessageChars),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4_000) }))
    .max(ASK_LIMITS.maxHistoryTurns)
    .default([]),
  context: contextSchema,
});

/** Execute one READ tool against real data. Never throws — a query failure
 *  becomes an honest "couldn't read that" tool result, not a crash. */
const runReadTool = async (
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> => {
  try {
    if (name === 'get_growth') {
      const days = typeof args.days === 'number' ? Math.min(Math.max(args.days, 1), 90) : 30;
      return await buildGrowthSummary(userId, days);
    }
    if (name === 'get_action_log') {
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 100) : 30;
      const filter: Record<string, unknown> = { userId };
      if (typeof args.actionType === 'string') filter.actionType = args.actionType;
      const entries = await ActionLogModel.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
      return entries.map((e) => ({
        actionType: e.actionType,
        targetHandle: e.targetHandle ?? null,
        matchedKeyword: e.matchedKeyword ?? null,
        success: e.success,
        timestamp: (e.timestamp as Date).toISOString(),
      }));
    }
    if (name === 'explain_action') {
      const handle = typeof args.targetHandle === 'string' ? args.targetHandle.replace(/^@/, '') : null;
      if (!handle) return { error: 'no handle given' };
      const entries = await ActionLogModel.find({
        userId,
        targetHandle: new RegExp(`^${handle}$`, 'i'),
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
      if (entries.length === 0) return { found: false, note: 'No recorded actions on this handle.' };
      return {
        found: true,
        actions: entries.map((e) => ({
          actionType: e.actionType,
          matchedKeyword: e.matchedKeyword ?? null,
          success: e.success,
          timestamp: (e.timestamp as Date).toISOString(),
        })),
      };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'query failed' };
  }
  return { error: 'unknown tool' };
};

askRouter.post(
  '/',
  requireAuth,
  // A conversational surface, not a bulk API — 20/hour is generous for a
  // human typing questions, and bounds OpenAI spend on a route with a
  // multi-call tool loop.
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: (req) => `ask:${req.auth?.sub ?? req.ip}` }),
  validate(askSchema),
  asyncHandler(async (req, res) => {
    if (!hasOpenAI()) {
      res.status(503).json(err('openai_unconfigured', 'OPENAI_API_KEY not set on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { message, history, context } = req.body as z.infer<typeof askSchema>;
    const client = getOpenAI();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt(context) },
      ...history.map((h): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    let result: AskResult | null = null;

    for (let round = 0; round < ASK_LIMITS.maxToolRounds; round++) {
      let completion;
      try {
        completion = await client.chat.completions.create({
          model: MODEL,
          messages,
          tools: ALL_TOOLS,
          tool_choice: 'auto',
        });
      } catch (e) {
        req.log.error({ err: e }, 'ask: OpenAI call failed');
        res.status(502).json(err('ask_failed', 'Could not reach the model right now'));
        return;
      }

      const choice = completion.choices[0];
      const toolCalls = choice?.message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        result = { type: 'answer', text: (choice?.message?.content ?? '').trim() || "I don't have an answer for that." };
        break;
      }

      // The model may ask for several tools in one turn — but the FIRST
      // mutating/client call in the batch ends the loop right there. Never
      // execute it, and never execute anything queued after it either: a
      // proposal is a stopping point, not one step in a longer plan.
      const first = toolCalls[0];
      if (!first) break;
      const name = first.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(first.function.arguments || '{}');
      } catch {
        /* malformed args — treated as empty below */
      }

      if (isMutating(name)) {
        const summary = typeof args.summary === 'string' ? args.summary.slice(0, 500) : `${name.replace(/_/g, ' ')}`;
        // draft_post's TEXT is generated here — not a mutation (nothing is
        // saved or scheduled), just the creative work, so the diff the user
        // sees already has real words to approve rather than a promise of some.
        if (name === 'draft_post' && typeof args.description === 'string') {
          try {
            const user = await UserModel.findById(req.auth.sub).lean();
            const text = await generatePostText({
              tone: 'friendly',
              description: args.description,
              voice: user?.voiceProfile?.summary ?? null,
            });
            args = { ...args, text };
          } catch (e) {
            req.log.warn({ err: e }, 'ask: draft_post generation failed');
          }
        }
        result = { type: 'diff', diff: { tool: name, args, summary } };
        break;
      }
      if (isClientTool(name)) {
        const summary = typeof args.summary === 'string' ? args.summary.slice(0, 500) : 'Run a dry run';
        result = { type: 'client_action', action: name, summary };
        break;
      }

      // A read tool — execute for real, feed the result back, keep going.
      const toolResult = await runReadTool(req.auth.sub, name, args);
      messages.push({
        role: 'assistant',
        content: choice?.message?.content ?? null,
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        const isFirst = tc.id === first.id;
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(isFirst ? toolResult : { skipped: true }),
        });
      }
    }

    if (!result) {
      result = {
        type: 'unknown',
        text: "That took more steps than I could take in one go — try asking a narrower question.",
      };
    }

    res.json(ok(result));
  }),
);
