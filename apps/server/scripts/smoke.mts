/* eslint-disable no-console */
/**
 * End-to-end auth smoke test.
 * Requires apps/server/.env populated with MONGODB_URI and JWT_SECRET.
 * Resend can stay unset — sign-in code is exposed inline in dev mode.
 *
 * Run with: pnpm --filter @casper/server smoke
 */
import 'dotenv/config';

const API = process.env.SMOKE_API_BASE ?? 'http://localhost:4000';
const TEST_EMAIL = `casper-smoke+${Date.now()}@example.com`;

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

  // 2. Request sign-in code (dev-mode returns the code inline)
  const codeResp = must(
    await call<{ sent: boolean; via: string; devCode?: string }>(
      'POST',
      '/api/auth/request-code',
      { body: { email: TEST_EMAIL } },
    ),
    'POST /api/auth/request-code',
  );
  console.log('✓  code sent:', codeResp);
  if (!codeResp.devCode) {
    throw new Error('No devCode returned — needs RESEND unset and NODE_ENV != production');
  }

  // 3. Verify code
  const verifyResp = must(
    await call<{ token: string; user: { id: string; email: string } }>(
      'POST',
      '/api/auth/verify-code',
      { body: { email: TEST_EMAIL, code: codeResp.devCode } },
    ),
    'POST /api/auth/verify-code',
  );
  console.log('✓  verified, jwt issued for', verifyResp.user.email);
  const jwt = verifyResp.token;

  // 4. Re-using the same code should fail
  const reuse = await call<unknown>(
    'POST',
    '/api/auth/verify-code',
    { body: { email: TEST_EMAIL, code: codeResp.devCode } },
  );
  if (reuse.ok) throw new Error('expected code reuse to fail');
  console.log('✓  code single-use enforced');

  // 5. GET /me
  const me = must(
    await call<{ id: string; email: string }>('GET', '/api/me', { token: jwt }),
    'GET /api/me',
  );
  console.log('✓  /me:', me);

  // 6. Log an action
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

  // 7. DELETE /account
  const wipe = must(
    await call<{ deleted: Record<string, number> }>('DELETE', '/api/account', { token: jwt }),
    'DELETE /api/account',
  );
  console.log('✓  account wiped:', wipe);

  // 8. /me should now 404 (user gone)
  const after = await call<unknown>('GET', '/api/me', { token: jwt });
  if (after.ok) throw new Error('expected /me to fail after account delete');
  console.log('✓  /me rejects after wipe');

  console.log('\n🎉  M1 smoke OK');
};

run().catch((err) => {
  console.error('\n❌  smoke failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
