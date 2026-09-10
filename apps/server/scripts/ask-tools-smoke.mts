/* eslint-disable no-console */
/**
 * Ask tool-definition smoke (updateplan 5.2).
 *
 * Nothing here calls OpenAI or touches a database — it pins the STATIC
 * contract every tool has to satisfy before a single request is ever made:
 *   - every tool name is classified as exactly one of read/mutating/client
 *     (never zero, never two — a tool that isn't a real read but also isn't
 *     caught by isMutating/isClientTool would be executed as neither AND
 *     rejected as neither, i.e. silently dropped)
 *   - every mutating/client tool's own JSON schema requires `summary` — the
 *     "Do it" card's only sentence, so a tool that skipped it would silently
 *     ask for trust the UI can't back up
 *   - the two publish-shaped tools (schedule_post, run_dry_run — the ones
 *     that touch the real world outside the conversation) are classified as
 *     mutating/client, never as a plain read that would just run
 *   - every schema is valid enough for the OpenAI SDK to accept: an object
 *     with a properties map, and every `required` name is an actual property
 *
 * Run with: pnpm --filter @casper/server ask-tools-smoke
 */
import {
  ALL_TOOLS,
  READ_TOOLS,
  MUTATING_TOOLS,
  CLIENT_TOOLS,
  isMutating,
  isClientTool,
  isReadTool,
  requiresSummary,
  systemPrompt,
} from '../src/openai/ask-tools.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const names = ALL_TOOLS.map((t) => t.function.name);

// --- every tool is classified as exactly one kind ---------------------------
for (const t of ALL_TOOLS) {
  const name = t.function.name;
  const kinds = [isReadTool(name), isMutating(name), isClientTool(name)].filter(Boolean).length;
  assert(kinds === 1, `${name} is classified as exactly one of read/mutating/client (got ${kinds})`);
}
assert(new Set(names).size === names.length, 'no duplicate tool names across the whole set');
assert(
  ALL_TOOLS.length === READ_TOOLS.length + MUTATING_TOOLS.length + CLIENT_TOOLS.length,
  'ALL_TOOLS is exactly the union of the three lists, nothing more',
);

// --- a tool call to something unknown is neither read, mutating, nor client -
assert(!isReadTool('delete_everything'), 'an unknown tool name is not a read tool');
assert(!isMutating('delete_everything'), 'an unknown tool name is not classified as mutating');
assert(!isClientTool('delete_everything'), 'an unknown tool name is not classified as a client action');

// --- every mutating/client tool REQUIRES summary in its own schema ---------
for (const t of [...MUTATING_TOOLS, ...CLIENT_TOOLS]) {
  assert(requiresSummary(t), `${t.function.name} requires 'summary' in its own JSON schema`);
}
for (const t of READ_TOOLS) {
  assert(
    !(t.function.parameters as { required?: string[] } | undefined)?.required?.includes('summary'),
    `${t.function.name} (a read tool) does not require 'summary' — it never shows a Do-it card`,
  );
}

// --- publish-shaped tools are never treated as plain reads -----------------
assert(isMutating('schedule_post'), 'schedule_post — publishes publicly — is a mutating tool, not a read');
assert(!isReadTool('schedule_post'), 'schedule_post is never classified as a read');
assert(isClientTool('run_dry_run'), 'run_dry_run — runs in the real browser — is a client tool');
assert(!isReadTool('run_dry_run'), 'run_dry_run is never classified as a plain read that would just execute');

// --- every mutation tool really is in the mutating list, not read/client ---
for (const name of ['update_settings', 'add_target', 'remove_target', 'draft_post', 'remember_instruction', 'forget_instruction']) {
  assert(isMutating(name), `${name} is classified as mutating`);
  assert(!isReadTool(name), `${name} is never classified as a read (would execute silently)`);
  assert(!isClientTool(name), `${name} is never classified as a client action`);
}

// --- read tools really do execute (are readable, safe by construction) -----
for (const name of ['get_growth', 'get_action_log', 'explain_action']) {
  assert(isReadTool(name), `${name} is classified as a read tool`);
  assert(!isMutating(name), `${name} is never classified as mutating`);
}

// --- schema sanity: every tool has a valid object schema, every `required`
//     name is an actual declared property -----------------------------------
for (const t of ALL_TOOLS) {
  const params = t.function.parameters as
    | { type?: string; properties?: Record<string, unknown>; required?: string[] }
    | undefined;
  assert(params?.type === 'object', `${t.function.name}'s schema is a JSON-schema object`);
  const propNames = Object.keys(params?.properties ?? {});
  const required = params?.required ?? [];
  assert(
    required.every((r) => propNames.includes(r)),
    `${t.function.name}: every 'required' name is a real declared property`,
  );
  assert(
    t.function.description !== undefined && t.function.description.length > 10,
    `${t.function.name} has a real description (the model's only guide to when to call it)`,
  );
}

// --- system prompt actually carries the four rules and the live context ----
const prompt = systemPrompt({
  targets: ['levelsio'],
  topics: ['indie hacking'],
  searchQueries: [],
  safetyPreset: 'balanced',
  activeHours: { startHour: 9, endHour: 22 },
  isPaused: false,
  autoPostEnabled: true,
  standingInstructions: ['never reply to crypto posts'],
});
assert(prompt.includes('levelsio'), 'system prompt names the watched target');
assert(prompt.includes('never reply to crypto posts'), 'system prompt carries the standing instruction');
assert(/never\b.*fabricat|never state a number/i.test(prompt), 'system prompt states the no-fabrication rule');
assert(/never applied by you|Do it/i.test(prompt), 'system prompt states the diff-confirmation rule');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 ask-tools-smoke OK');
