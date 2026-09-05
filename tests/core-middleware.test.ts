import { expect, test } from 'bun:test';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { createApp } from '../src/app';
import { AppError } from '../src/core/errors/app-error';

const createTestApp = (isDatabaseReady: () => Promise<boolean> = async () => true) => {
  return createApp({ internalApiKey: 'test-api-key', isDatabaseReady });
};

test('returns a public health response with a generated request ID', async () => {
  const response = await createTestApp().request('http://localhost/health');

  expect(response.status).toBe(200);
  expect(response.headers.get('X-Request-Id')).toBeString();
  expect(await response.json()).toEqual({ success: true, data: { status: 'ok' } });
});

test('preserves a caller-provided request ID', async () => {
  const response = await createTestApp().request('http://localhost/health', {
    headers: { 'X-Request-Id': 'req_from_caller' },
  });

  expect(response.headers.get('X-Request-Id')).toBe('req_from_caller');
});

test('returns a public readiness response when PostgreSQL is available', async () => {
  const response = await createTestApp().request('http://localhost/health/ready');

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: { status: 'ok' } });
});

test('returns a safe unavailable response when PostgreSQL is unavailable', async () => {
  const response = await createTestApp(async () => false).request('http://localhost/health/ready');

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      details: null,
    },
    requestId: expect.any(String),
  });
});

test('bounds the readiness check with a timeout', async () => {
  const app = createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: () => new Promise<boolean>(() => undefined),
    readinessTimeoutMs: 5,
  });
  const response = await app.request('http://localhost/health/ready');

  expect(response.status).toBe(503);
});

test('rejects API routes without a valid bearer token', async () => {
  const app = createTestApp();
  app.get('/api/protected', (context) => context.text('ok'));

  const response = await app.request('http://localhost/api/protected');

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
      details: null,
    },
    requestId: expect.any(String),
  });
});

test('allows API routes with a valid bearer token', async () => {
  const app = createTestApp();
  app.get('/api/protected', (context) => context.text('ok'));

  const response = await app.request('http://localhost/api/protected', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('ok');
});

test('maps application errors to safe API failures', async () => {
  const app = createTestApp();
  app.get('/test/app-error', () => {
    throw new AppError({
      code: 'EXAMPLE_CONFLICT',
      statusCode: 409,
      message: 'Example conflict',
      details: { internalId: 'do-not-expose' },
    });
  });

  const response = await app.request('http://localhost/test/app-error');

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'EXAMPLE_CONFLICT',
      message: 'Example conflict',
      details: null,
    },
    requestId: expect.any(String),
  });
});

test('maps Zod validation errors to safe field details', async () => {
  const app = createTestApp();
  app.post('/test/validation-error', async (context) => {
    const body = await context.req.json();
    z.object({ name: z.string().min(1) }).parse(body);

    return context.body(null, 204);
  });

  const response = await app.request('http://localhost/test/validation-error', {
    method: 'POST',
    body: JSON.stringify({ name: '' }),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        fields: [{ path: 'name', message: 'Too small: expected string to have >=1 characters' }],
      },
    },
    requestId: expect.any(String),
  });
});

test('maps Hono HTTP exceptions without exposing their message', async () => {
  const app = createTestApp();
  app.get('/test/http-error', () => {
    throw new HTTPException(400, { message: 'Sensitive downstream detail' });
  });

  const response = await app.request('http://localhost/test/http-error');

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Bad request',
      details: null,
    },
    requestId: expect.any(String),
  });
});

test('maps unexpected errors to a generic API failure', async () => {
  const app = createTestApp();
  app.get('/test/unexpected-error', () => {
    throw new Error('database password must not be exposed');
  });

  const response = await app.request('http://localhost/test/unexpected-error');

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: null,
    },
    requestId: expect.any(String),
  });
});
