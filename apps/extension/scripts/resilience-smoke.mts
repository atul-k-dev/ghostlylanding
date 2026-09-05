/* eslint-disable no-console */
/**
 * Network-resilience smoke: what apiFetch retries, what it must never retry,
 * and the version comparison behind the update warning.
 * Run with: pnpm --filter @casper/extension resilience-smoke
 */

// --- chrome stub (storage.js is pulled in by api.js) ------------------------
const store: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: { getManifest: () => ({ version: '2.1.0' }) },
  storage: {
    local: {
      get: async (key: string) => ({ [key]: store[key] }),
      set: async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      },
      remove: async (key: string) => {
        delete store[key];
      },
    },
  },
};

const { apiFetch } = await import('../src/lib/api.js');
const { compareVersions } = await import('../src/lib/selector-config.js');

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

/** Replace global fetch with a scripted sequence; returns the call counter. */
function scriptFetch(steps: (number | 'throw')[]): () => number {
  let calls = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async () => {
    const step = steps[Math.min(calls, steps.length - 1)];
    calls++;
    if (step === 'throw') throw new Error('network down');
    return {
      status: step,
      json: async () => ({ ok: step! < 400, data: {}, error: { code: 'x', message: 'x' } }),
    };
  };
  return () => calls;
}

// --- retries on transient failures ------------------------------------------
let calls = scriptFetch(['throw', 'throw', 200]);
let res = await apiFetch('/api/test');
assert(calls() === 3, 'a GET retries through two network failures');
assert(res.ok === true, 'and succeeds on the third attempt');

calls = scriptFetch([503, 200]);
await apiFetch('/api/test');
assert(calls() === 2, 'a 503 is retried');

calls = scriptFetch([500, 500, 500]);
await apiFetch('/api/test');
assert(calls() === 1, 'a 500 is NOT retried (it is the server\'s real answer)');

// --- the ones that must never be repeated -----------------------------------
for (const status of [400, 401, 402, 404, 409]) {
  calls = scriptFetch([status, 200]);
  await apiFetch('/api/test');
  assert(calls() === 1, `a ${status} is never retried`);
}

// --- writes are single-shot unless they opt in ------------------------------
calls = scriptFetch(['throw', 200]);
await apiFetch('/api/test', { method: 'POST', body: {} });
assert(calls() === 1, 'a POST is not retried by default (most writes cannot repeat safely)');

calls = scriptFetch(['throw', 'throw', 200]);
await apiFetch('/api/test', { method: 'POST', body: {}, retries: 3 });
assert(calls() === 3, 'a POST that opts in (action-log flush) does retry');

// --- exhausted retries report a network error -------------------------------
calls = scriptFetch(['throw', 'throw', 'throw']);
res = await apiFetch('/api/test');
assert(calls() === 3, 'retries stop at the limit');
assert(res.ok === false, 'and the caller sees a failure');

// --- version comparison ------------------------------------------------------
assert(compareVersions('2.1.0', '2.0.0') > 0, '2.1.0 is newer than 2.0.0');
assert(compareVersions('2.0.0', '2.1.0') < 0, '2.0.0 is older than 2.1.0');
assert(compareVersions('2.1.0', '2.1.0') === 0, 'equal versions compare equal');
// The classic: string comparison would call 2.10.0 older than 2.9.0.
assert(compareVersions('2.10.0', '2.9.0') > 0, '2.10.0 is newer than 2.9.0 (numeric, not string)');
assert(compareVersions('10.0.0', '9.99.99') > 0, 'major version dominates');
assert(compareVersions('2.1', '2.1.0') === 0, 'a missing patch counts as zero');
assert(compareVersions('2.1.1', '2.1') > 0, 'a present patch beats a missing one');
assert(compareVersions('', '0.0.0') === 0, 'an empty version is treated as 0.0.0');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 resilience-smoke OK');
