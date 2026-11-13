import { expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { testWebAuth, testWebPassword } from './fixtures/auth';
import type { AiClient } from '../src/core/ai/ai.types';
import type { JunkItem } from '../src/modules/junk/junk.types';
import type { JunkAiCreateRequest, JunkAiService } from '../src/modules/junk/junk-ai/junk-ai.types';

const baseUrl = 'https://hermes.example.com';

const junkItem: JunkItem = {
  code: 'JK-20261114-001',
  title: 'Rust ownership article',
  category: 'Article',
  raw_text: 'artikel bagus soal rust https://example.com/rust',
  content_text: 'Article about Rust ownership.',
  source_url: 'https://example.com/rust',
  source_name: null,
  tags: ['Rust', 'Programming'],
  created_at: '2026-11-14T10:00:00.000Z',
  updated_at: '2026-11-14T10:00:00.000Z',
};

const createJunkAiServiceStub = (overrides: Partial<JunkAiService> = {}): JunkAiService => ({
  createWithAi: async () => junkItem,
  ...overrides,
});

let activeJunkAiService = createJunkAiServiceStub();

mock.module('../src/modules/junk/junk-ai/junk-ai.service', () => ({
  createWithAi: (input: JunkAiCreateRequest, client: AiClient | null) =>
    activeJunkAiService.createWithAi(input, client),
}));

const { createApp } = await import('../src/app');

const fakeAiClient: AiClient = { generateJson: async () => ({}) };

const createAiApp = (overrides: Partial<JunkAiService> = {}, aiClient: AiClient | null = fakeAiClient) => {
  activeJunkAiService = createJunkAiServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
    webAuth: testWebAuth,
    aiClient,
    authDependencies: { verifyPassword: async (password) => password === testWebPassword },
  });
};

const signIn = async (app: ReturnType<typeof createAiApp>): Promise<string> => {
  const response = await app.request(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: testWebAuth.origin },
    body: JSON.stringify({ password: testWebPassword }),
  });

  const cookie = response.headers.get('Set-Cookie')?.split(';')[0];

  if (cookie === undefined) {
    throw new Error('Expected an auth cookie.');
  }

  return cookie;
};

const postAi = (
  app: ReturnType<typeof createAiApp>,
  cookie: string | undefined,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  app.request(`${baseUrl}/api/v1/junk/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: testWebAuth.origin,
      ...(cookie === undefined ? {} : { Cookie: cookie }),
      ...headers,
    },
    body: JSON.stringify(body),
  });

test('creates and returns a junk item for a browser session', async () => {
  let receivedInput: JunkAiCreateRequest | undefined;
  let receivedClient: AiClient | null | undefined;
  const app = createAiApp({
    createWithAi: async (input, client) => {
      receivedInput = input;
      receivedClient = client;

      return junkItem;
    },
  });
  const cookie = await signIn(app);

  const response = await postAi(app, cookie, { text: 'artikel bagus soal rust https://example.com/rust' });

  expect(response.status).toBe(201);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ success: true, data: junkItem });
  expect(receivedInput).toEqual({ text: 'artikel bagus soal rust https://example.com/rust' });
  expect(receivedClient).toBe(fakeAiClient);
});

test('rejects invalid requests without calling the service', async () => {
  for (const body of [
    {},
    { text: '' },
    { text: '   ' },
    { text: 'a'.repeat(20_001) },
    { text: 'hello', extra: true },
  ]) {
    let called = false;
    const app = createAiApp({
      createWithAi: async () => {
        called = true;

        return junkItem;
      },
    });
    const cookie = await signIn(app);
    const response = await postAi(app, cookie, body);

    expect(response.status).toBe(400);
    expect(called).toBe(false);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  }
});

test('requires browser authentication and an allowed origin', async () => {
  const app = createAiApp();
  const cookie = await signIn(app);

  const unauthenticated = await postAi(app, undefined, { text: 'hello' });
  expect(unauthenticated.status).toBe(401);

  const agent = await postAi(app, undefined, { text: 'hello' }, { Authorization: 'Bearer test-api-key' });
  expect(agent.status).toBe(403);
  expect(await agent.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });

  const missingOrigin = await app.request(`${baseUrl}/api/v1/junk/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ text: 'hello' }),
  });
  expect(missingOrigin.status).toBe(403);
});

test('returns the safe error envelope when the AI is not configured or fails', async () => {
  const cases = [
    {
      code: 'AI_NOT_CONFIGURED',
      message: 'AI feature is not configured.',
      client: null,
    },
    {
      code: 'AI_UNAVAILABLE',
      message: 'AI service is unavailable.',
      client: fakeAiClient,
    },
    {
      code: 'AI_INVALID_RESPONSE',
      message: 'AI response could not be used.',
      client: fakeAiClient,
    },
  ];

  for (const testCase of cases) {
    const app = createAiApp(
      {
        createWithAi: async () => {
          throw new AppError({ code: testCase.code, message: testCase.message, statusCode: 503 });
        },
      },
      testCase.client,
    );
    const cookie = await signIn(app);

    const response = await postAi(app, cookie, { text: 'hello' });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: testCase.code, message: testCase.message, details: null },
      request_id: expect.any(String),
    });
  }
});
