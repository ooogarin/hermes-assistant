import { expect, test } from 'bun:test';
import { z } from 'zod';
import { createApp } from '../src/app';
import { successResponse } from '../src/core/http/response';
import { sessionResponseSchema } from '../src/modules/auth/auth.validator';
import { testWebAuth, testWebPassword } from './fixtures/auth';
import type { CreateAppOptions } from '../src/app';

const baseUrl = 'https://hermes.example.com';
const initialTime = Date.parse('2026-10-01T12:00:00.000Z');
const successEnvelopeSchema = z.strictObject({ success: z.literal(true), data: sessionResponseSchema });
const errorEnvelopeSchema = z.strictObject({
  success: z.literal(false),
  error: z.strictObject({ code: z.string(), message: z.string(), details: z.unknown().nullable() }),
  request_id: z.string(),
});
const readErrorEnvelope = async (response: Response) => errorEnvelopeSchema.parse(await response.json());
const createAuthApp = (options: Partial<CreateAppOptions> = {}) => {
  const app = createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
    webAuth: testWebAuth,
    ...options,
    authDependencies: {
      now: () => initialTime,
      verifyPassword: async (password) => password === testWebPassword,
      ...options.authDependencies,
    },
  });
  app.on(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], '/api/v1/protected', (context) =>
    successResponse({ context, data: { status: 'ok' } }),
  );
  return app;
};

const sendLogin = (
  app: ReturnType<typeof createAuthApp>,
  body: unknown = { password: testWebPassword },
  headers: Record<string, string> = {},
) =>
  app.request(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: testWebAuth.origin, ...headers },
    body: JSON.stringify(body),
  });

const cookieFrom = (response: Response): string => {
  const cookie = response.headers.get('Set-Cookie')?.split(';')[0];
  if (cookie === undefined) throw new Error('Expected session cookie');
  return cookie;
};

test('authenticates with native Argon2 verification and returns only safe session metadata', async () => {
  const app = createAuthApp({ authDependencies: { verifyPassword: undefined } });
  const failed = await sendLogin(app, { password: 'wrong-test-password' });
  expect(failed.status).toBe(401);
  expect((await readErrorEnvelope(failed)).error.code).toBe('INVALID_CREDENTIALS');
  expect(failed.headers.get('Set-Cookie')).toBeNull();

  const response = await sendLogin(app);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  const payload = successEnvelopeSchema.parse(await response.json());
  expect(sessionResponseSchema.parse(payload.data)).toEqual({
    authenticated: true,
    expires_at: '2026-10-08T12:00:00.000Z',
  });
  const cookie = response.headers.get('Set-Cookie');
  expect(cookie).toMatch(/^__Host-hermes_session=[A-Za-z0-9_-]{43};/);
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=604800']) {
    expect(cookie).toContain(attribute);
  }
  expect(cookie).not.toContain('Domain=');
  expect(JSON.stringify(payload)).not.toContain(cookieFrom(response).split('=')[1]);
  expect(JSON.stringify(payload)).not.toContain(testWebPassword);
  expect(JSON.stringify(payload)).not.toContain(testWebAuth.password_hash);
});

test('preserves password whitespace instead of silently normalizing it', async () => {
  const passwordWithWhitespace = `  ${testWebPassword}  `;
  const app = createAuthApp({
    authDependencies: { verifyPassword: async (password) => password === passwordWithWhitespace },
  });
  expect((await sendLogin(app)).status).toBe(401);
  expect((await sendLogin(app, { password: passwordWithWhitespace })).status).toBe(200);
});

test('uses an unprefixed cookie for local HTTP and deletes it with the same attributes', async () => {
  const configuration = { ...testWebAuth, origin: 'http://127.0.0.1:5173', secure_cookie: false };
  const app = createAuthApp({ webAuth: configuration });
  const response = await sendLogin(app, undefined, { Origin: configuration.origin });
  expect(response.status).toBe(200);
  expect(cookieFrom(response)).toMatch(/^hermes_session=/);
  expect(response.headers.get('Set-Cookie')).not.toContain('Secure');
  const logout = await app.request(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookieFrom(response), Origin: configuration.origin },
  });
  expect(logout.status).toBe(204);
  expect(logout.headers.get('Set-Cookie')).toContain('hermes_session=; Max-Age=0; Path=/');
  expect(logout.headers.get('Set-Cookie')).not.toContain('Secure');
});

test('requires valid browser sessions on domain reads and writes', async () => {
  const app = createAuthApp();
  for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
    const anonymous = await app.request(`${baseUrl}/api/v1/protected`, { method });
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get('Cache-Control')).toBe('private, no-store');
  }

  const cookie = cookieFrom(await sendLogin(app));
  for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
    const response = await app.request(`${baseUrl}/api/v1/protected`, {
      method,
      headers: { Cookie: cookie, Origin: testWebAuth.origin },
    });
    expect(response.status).toBe(200);
  }
});

test('session inspection requires a cookie and does not extend expiry', async () => {
  let now = initialTime;
  const app = createAuthApp({ authDependencies: { now: () => now } });
  const bearerOnly = await app.request(`${baseUrl}/api/v1/auth/session`, {
    headers: { Authorization: 'Bearer test-api-key' },
  });
  expect(bearerOnly.status).toBe(401);
  const cookie = cookieFrom(await sendLogin(app));
  now += 60_000;
  const response = await app.request(`${baseUrl}/api/v1/auth/session`, { headers: { Cookie: cookie } });
  expect(response.status).toBe(200);
  expect(successEnvelopeSchema.parse(await response.json()).data.expires_at).toBe('2026-10-08T12:00:00.000Z');
  expect(response.headers.get('Set-Cookie')).toBeNull();
  now = initialTime + 604_800_000;
  expect((await app.request(`${baseUrl}/api/v1/auth/session`, { headers: { Cookie: cookie } })).status).toBe(401);
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: cookie } })).status).toBe(401);
});

test('logout revokes copied tokens and is idempotent when absent or expired', async () => {
  const app = createAuthApp();
  const cookie = cookieFrom(await sendLogin(app));
  const logout = await app.request(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: testWebAuth.origin },
  });
  expect(logout.status).toBe(204);
  expect(await logout.text()).toBe('');
  expect(logout.headers.get('Cache-Control')).toBe('private, no-store');
  const clearedCookie = logout.headers.get('Set-Cookie');
  for (const attribute of ['__Host-hermes_session=', 'Max-Age=0', 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax']) {
    expect(clearedCookie).toContain(attribute);
  }
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: cookie } })).status).toBe(401);
  for (const rawCookie of [cookie, '__Host-hermes_session=%ZZ', '']) {
    const repeated = await app.request(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: rawCookie, Origin: testWebAuth.origin },
    });
    expect(repeated.status).toBe(204);
  }
});

test('a successful re-login replaces the old token but a wrong password preserves the session', async () => {
  const app = createAuthApp();
  const oldCookie = cookieFrom(await sendLogin(app));
  expect((await sendLogin(app, { password: 'wrong' }, { Cookie: oldCookie })).status).toBe(401);
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: oldCookie } })).status).toBe(200);
  const newCookie = cookieFrom(await sendLogin(app, undefined, { Cookie: oldCookie }));
  expect(newCookie).not.toBe(oldCookie);
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: oldCookie } })).status).toBe(401);
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: newCookie } })).status).toBe(200);
});

test('cookie writes and public auth writes require an exact allowed Origin', async () => {
  const app = createAuthApp();
  const cookie = cookieFrom(await sendLogin(app));
  for (const origin of [
    undefined,
    'null',
    'https://evil.example',
    `${testWebAuth.origin}.evil.example`,
    `${testWebAuth.origin}:444`,
    `${testWebAuth.origin}/`,
  ]) {
    const headers: Record<string, string> = { Cookie: cookie };
    if (origin !== undefined) headers.Origin = origin;
    for (const path of ['/api/v1/protected', '/api/v1/auth/logout']) {
      expect((await app.request(`${baseUrl}${path}`, { method: 'POST', headers })).status).toBe(403);
    }
    const response = await app.request(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testWebPassword }),
    });
    expect(response.status).toBe(403);
  }
  expect((await app.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: cookie } })).status).toBe(200);
});

test('Agent bearer access still works without Origin while invalid bearer cannot fall back to a cookie', async () => {
  const app = createAuthApp();
  const cookie = cookieFrom(await sendLogin(app));
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const response = await app.request(`${baseUrl}/api/v1/protected`, {
      method,
      headers: { Authorization: 'Bearer test-api-key', Cookie: '__Host-hermes_session=invalid' },
    });
    expect(response.status).toBe(200);
  }
  for (const authorization of [
    '',
    'Bearer wrong',
    'Basic test-api-key',
    'bearer test-api-key',
    `Bearer ${'x'.repeat(600)}`,
  ]) {
    const response = await app.request(`${baseUrl}/api/v1/protected`, {
      headers: { Authorization: authorization, Cookie: cookie },
    });
    expect(response.status).toBe(401);
  }
});

test('public exemptions are limited to the exact login/logout method and path', async () => {
  const app = createAuthApp();
  for (const [path, method] of [
    ['/auth/login', 'GET'],
    ['/auth/logout', 'GET'],
    ['/auth/session', 'POST'],
    ['/auth/unknown', 'POST'],
    ['/auth/login/', 'POST'],
  ]) {
    expect((await app.request(`${baseUrl}/api/v1${path}`, { method })).status).toBe(401);
  }
  for (const path of ['/health', '/health/ready']) expect((await app.request(`${baseUrl}${path}`)).status).toBe(200);
});

test('rejects malformed and unknown cookies safely and keeps app session state isolated', async () => {
  const app = createAuthApp();
  for (const rawCookie of [
    '__Host-hermes_session=%ZZ',
    '__Host-hermes_session="bad"',
    `__Host-hermes_session=${'x'.repeat(43)}`,
    'hermes_session=invalid',
    'unrelated=value',
  ]) {
    const response = await app.request(`${baseUrl}/api/v1/auth/session`, { headers: { Cookie: rawCookie } });
    expect(response.status).toBe(401);
    expect((await readErrorEnvelope(response)).error.code).toBe('UNAUTHENTICATED');
  }
  const cookie = cookieFrom(await sendLogin(app));
  const restarted = createAuthApp();
  expect((await restarted.request(`${baseUrl}/api/v1/protected`, { headers: { Cookie: cookie } })).status).toBe(401);
});

test('validates strict login fields and malformed JSON before invoking password verification', async () => {
  let verifications = 0;
  const app = createAuthApp({
    authDependencies: {
      verifyPassword: async () => {
        verifications += 1;
        return true;
      },
    },
  });
  for (const body of [
    {},
    { password: '' },
    { password: 123 },
    { password: 'x'.repeat(513) },
    { password: testWebPassword, 'must-not-echo-input': true },
    null,
  ]) {
    const response = await sendLogin(app, body);
    expect(response.status).toBe(400);
    const payload = await readErrorEnvelope(response);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(payload)).not.toContain('must-not-echo-input');
  }
  const malformed = await app.request(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { Origin: testWebAuth.origin, 'Content-Type': 'application/json' },
    body: '{',
  });
  expect(malformed.status).toBe(400);
  expect(verifications).toBe(0);
});

test('requires JSON media type and accepts a JSON charset parameter', async () => {
  const app = createAuthApp();
  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', '']) {
    const response = await sendLogin(app, undefined, { 'Content-Type': contentType });
    expect(response.status).toBe(415);
    expect((await readErrorEnvelope(response)).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  }
  expect((await sendLogin(app, undefined, { 'Content-Type': 'application/json; charset=utf-8' })).status).toBe(200);
});

test('limits actual streamed body bytes even with missing or inaccurate Content-Length', async () => {
  for (const contentLength of [undefined, '1']) {
    const app = createAuthApp();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2_000));
        controller.enqueue(new Uint8Array(2_097));
        controller.close();
      },
    });
    const headers: Record<string, string> = { Origin: testWebAuth.origin, 'Content-Type': 'application/json' };
    if (contentLength !== undefined) headers['Content-Length'] = contentLength;
    const response = await app.request(
      new Request(`${baseUrl}/api/v1/auth/login`, { method: 'POST', headers, body: stream }),
    );
    expect(response.status).toBe(413);
    expect((await readErrorEnvelope(response)).error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  }
});

test('counts malformed login attempts, returns Retry-After, and permits login after the window resets', async () => {
  let now = initialTime;
  const app = createAuthApp({ authDependencies: { now: () => now } });
  for (let index = 0; index < 10; index += 1) expect((await sendLogin(app, {})).status).toBe(400);
  const blocked = await sendLogin(app);
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('Retry-After')).toBe('60');
  expect((await readErrorEnvelope(blocked)).error.code).toBe('RATE_LIMITED');
  now += 60_000;
  expect((await sendLogin(app)).status).toBe(200);
});

test('limits concurrent verifications and releases the slot after completing', async () => {
  const started = Promise.withResolvers<void>();
  const verification = Promise.withResolvers<boolean>();
  const app = createAuthApp({
    authDependencies: {
      verifyPassword: async () => {
        started.resolve();
        return verification.promise;
      },
    },
  });
  const first = sendLogin(app);
  await started.promise;
  const busy = await sendLogin(app);
  expect(busy.status).toBe(429);
  expect(busy.headers.get('Retry-After')).toBe('1');
  verification.resolve(true);
  expect((await first).status).toBe(200);
  expect((await sendLogin(app)).status).toBe(200);
});

test('maps verifier failures safely and releases the slot for retry', async () => {
  let calls = 0;
  const app = createAuthApp({
    authDependencies: {
      verifyPassword: async () => {
        calls += 1;
        if (calls === 1) throw new Error('sensitive dependency detail');
        return true;
      },
    },
  });
  const response = await sendLogin(app);
  expect(response.status).toBe(503);
  const payload = await readErrorEnvelope(response);
  expect(payload.error.code).toBe('SERVICE_UNAVAILABLE');
  expect(JSON.stringify(payload)).not.toContain('sensitive dependency detail');
  expect(response.headers.get('Set-Cookie')).toBeNull();
  expect((await sendLogin(app)).status).toBe(200);
});

test('uncaches successful, unauthorized, forbidden, and unknown API responses', async () => {
  const app = createAuthApp();
  const cookie = cookieFrom(await sendLogin(app));
  for (const [path, method, headers] of [
    ['/api/v1/auth/session', 'GET', { Cookie: cookie }],
    ['/api/v1/protected', 'GET', {}],
    ['/api/v1/protected', 'POST', { Cookie: cookie }],
    ['/api/v1/unknown', 'GET', { Cookie: cookie }],
  ] as const) {
    const response = await app.request(`${baseUrl}${path}`, { method, headers });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  }
});

test('keeps authenticated API responses uncached even when a handler sets a cache policy', async () => {
  const app = createAuthApp();
  app.get('/api/v1/cache-policy', (context) => {
    context.header('Cache-Control', 'public, max-age=600');
    return successResponse({ context, data: { status: 'ok' } });
  });
  const response = await app.request(`${baseUrl}/api/v1/cache-policy`, {
    headers: { Authorization: 'Bearer test-api-key' },
  });
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});

test('handles login, authenticated access, and token revocation through a listening Bun server', async () => {
  const configuration = { ...testWebAuth, origin: 'http://127.0.0.1:5173', secure_cookie: false };
  const app = createAuthApp({ webAuth: configuration, authDependencies: { verifyPassword: undefined } });
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app.fetch });

  try {
    const response = await fetch(new URL('/api/v1/auth/login', server.url), {
      method: 'POST',
      headers: { Origin: configuration.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testWebPassword }),
    });
    expect(response.status).toBe(200);
    await response.arrayBuffer();
    const cookie = cookieFrom(response);
    const authenticated = await fetch(new URL('/api/v1/protected', server.url), { headers: { Cookie: cookie } });
    expect(authenticated.status).toBe(200);
    await authenticated.arrayBuffer();
    const logout = await fetch(new URL('/api/v1/auth/logout', server.url), {
      method: 'POST',
      headers: { Origin: configuration.origin, Cookie: cookie },
    });
    expect(logout.status).toBe(204);
    const replay = await fetch(new URL('/api/v1/protected', server.url), { headers: { Cookie: cookie } });
    expect(replay.status).toBe(401);
    await replay.arrayBuffer();
  } finally {
    await server.stop(true);
  }
});
