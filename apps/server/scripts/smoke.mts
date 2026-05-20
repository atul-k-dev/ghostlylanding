/* eslint-disable no-console */
/**
 * End-to-end auth smoke test (password flow).
 * Requires apps/server/.env populated with MONGODB_URI and JWT_SECRET.
 *
 * Run with: pnpm --filter @casper/server smoke
 */
import 'dotenv/config';

const API = process.env.SMOKE_API_BASE ?? 'http://localhost:4000';
const TEST_EMAIL = `casper-smoke+${Date.now()}@example.com`;
const TEST_PASSWORD = 'correct-horse-battery-staple';
const TEST_NAME = 'Casper Smoke';

interface ApiOk<T> {
  ok: true;
  data: T;
}
interface ApiErr {
  ok: false;
  error: { code: string; message: string };
}
type ApiResult<T> = ApiOk<T> | ApiErr;

const must = <T>(result: ApiResult<T>, where: string): T => {
  if (!result.ok) {
    throw new Error(`${where} failed: ${result.error.code} — ${result.error.message}`);
  }
  return result.data;
};

const call = async <T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  init?: { body?: unknown; token?: string },
): Promise<ApiResult<T>> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json()) as ApiResult<T>;
  return json;
};

const run = async (): Promise<void> => {
  console.log('🔎  smoke: target', API);

  // 1. Health
  const health = must(
    await call<{ status: string; db: string }>('GET', '/api/health'),
    'GET /api/health',
  );
  console.log('✓  health:', health);

  // 2. Signup
  const signup = must(
    await call<{ token: string; user: { id: string; email: string; name: string } }>(
      'POST',
      '/api/auth/signup',
      { body: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD } },
    ),
    'POST /api/auth/signup',
  );
  console.log('✓  signed up as', signup.user.email, '· name:', signup.user.name);

  // 3. Duplicate signup should 409
  const dup = await call<unknown>('POST', '/api/auth/signup', {
    body: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (dup.ok) throw new Error('expected duplicate signup to fail');
  console.log('✓  duplicate signup rejected:', dup.error.code);

  // 4. Wrong password
  const wrong = await call<unknown>('POST', '/api/auth/login', {
    body: { email: TEST_EMAIL, password: 'nope' },
  });
  if (wrong.ok) throw new Error('expected wrong password to fail');
  console.log('✓  wrong password rejected');

  // 5. Login with correct password
  const login = must(
    await call<{ token: string; user: { id: string } }>('POST', '/api/auth/login', {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
    }),
    'POST /api/auth/login',
  );
  const jwt = login.token;
  console.log('✓  login ok');

  // 6. GET /me
  const me = must(
    await call<{ id: string; email: string; name: string }>('GET', '/api/me', { token: jwt }),
    'GET /api/me',
  );
  console.log('✓  /me:', { id: me.id, email: me.email, name: me.name });

  // 7. Log an action
  const logResp = must(
    await call<{ inserted: number }>('POST', '/api/actions/log', {
      token: jwt,
      body: {
        entries: [
          {
            platform: 'twitter',
            actionType: 'like',
            targetUrl: 'https://x.com/example/status/1',
            targetHandle: '@example',
            success: true,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    }),
    'POST /api/actions/log',
  );
  console.log('✓  actions logged:', logResp);

  // 8. DELETE /account
  const wipe = must(
    await call<{ deleted: Record<string, number> }>('DELETE', '/api/account', { token: jwt }),
    'DELETE /api/account',
  );
  console.log('✓  account wiped:', wipe);

  // 9. /me should now 404
  const after = await call<unknown>('GET', '/api/me', { token: jwt });
  if (after.ok) throw new Error('expected /me to fail after account delete');
  console.log('✓  /me rejects after wipe');

  console.log('\n🎉  auth smoke OK');
};

run().catch((err) => {
  console.error('\n❌  smoke failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
