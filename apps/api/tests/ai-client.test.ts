import { expect, test } from 'bun:test';
import { createAiClient } from '../src/core/ai/ai-client';
import { AppError } from '../src/core/errors/app-error';
import type { AiClient, AiConfiguration, AiFailure } from '../src/core/ai/ai.types';

const configuration: AiConfiguration = {
  base_url: 'https://api.example.com/v1/',
  api_key: 'test-ai-key-that-must-not-leak',
  model: 'test-model',
  max_tokens: 4_096,
  temperature: 0,
  timeout_ms: 5_000,
};

const request = { system_prompt: 'Return JSON.', user_prompt: 'Artikel bagus soal rust' };

const providerResponse = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });

const providerErrorResponse = (status: number, error: unknown) =>
  new Response(JSON.stringify({ error }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

const generateAndCatch = async (client: AiClient): Promise<AppError> => {
  try {
    await client.generateJson(request);
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the AI client to fail.');
};

test('sends a JSON-mode chat request and returns the parsed object', async () => {
  const calls: Array<{ init: RequestInit; url: string }> = [];
  const client = createAiClient(configuration, {
    fetch: async (url, init) => {
      calls.push({ init, url });

      return providerResponse('{"title":"Rust article","tags":["rust"]}');
    },
  });

  const result = await client.generateJson(request);

  expect(result).toEqual({ title: 'Rust article', tags: ['rust'] });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe('https://api.example.com/v1/chat/completions');

  const headers = new Headers(calls[0]?.init.headers);
  expect(headers.get('Authorization')).toBe(`Bearer ${configuration.api_key}`);
  expect(headers.get('Content-Type')).toBe('application/json');

  const body = JSON.parse(String(calls[0]?.init.body));
  expect(body).toEqual({
    model: 'test-model',
    messages: [
      { role: 'system', content: request.system_prompt },
      { role: 'user', content: request.user_prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4_096,
    temperature: 0,
    stream: false,
  });
  expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
});

test('accepts JSON wrapped in a markdown fence', async () => {
  const client = createAiClient(configuration, {
    fetch: async () => providerResponse('```json\n{"title":"Fenced"}\n```'),
  });

  expect(await client.generateJson(request)).toEqual({ title: 'Fenced' });
});

test('maps an HTTP failure to a safe AI_UNAVAILABLE error', async () => {
  const failures: AiFailure[] = [];
  const client = createAiClient(configuration, {
    fetch: async () => providerErrorResponse(500, { message: 'provider detail', type: 'server_error' }),
    log: (failure) => failures.push(failure),
  });

  const error = await generateAndCatch(client);

  expect(error).toBeInstanceOf(AppError);
  expect(error.code).toBe('AI_UNAVAILABLE');
  expect(error.statusCode).toBe(503);
  expect(error.message).not.toContain(configuration.api_key);
  expect(error.message).not.toContain('provider detail');
  expect(failures).toHaveLength(1);
  expect(failures[0]).toEqual({
    endpoint: 'https://api.example.com/v1/chat/completions',
    kind: 'http',
    provider_code: 'server_error',
    provider_message: 'provider detail',
    status: 500,
  });
  expect(JSON.stringify(failures)).not.toContain(configuration.api_key);
});

test('distinguishes provider authentication, configuration, and rate-limit failures', async () => {
  const cases: Array<{ code: string; status: number }> = [
    { code: 'AI_AUTH_FAILED', status: 401 },
    { code: 'AI_AUTH_FAILED', status: 403 },
    { code: 'AI_CONFIGURATION_ERROR', status: 400 },
    { code: 'AI_CONFIGURATION_ERROR', status: 404 },
    { code: 'AI_CONFIGURATION_ERROR', status: 422 },
    { code: 'AI_RATE_LIMITED', status: 429 },
    { code: 'AI_UNAVAILABLE', status: 502 },
  ];

  for (const testCase of cases) {
    const client = createAiClient(configuration, {
      fetch: async () => providerErrorResponse(testCase.status, { message: 'rejected', type: 'invalid_request_error' }),
      log: () => {},
    });

    const error = await generateAndCatch(client);

    expect(error.code).toBe(testCase.code);
    expect(error.statusCode).toBe(503);
  }
});

test('does not log a provider message that may echo a masked key', async () => {
  const failures: AiFailure[] = [];
  const client = createAiClient(configuration, {
    fetch: async () =>
      providerErrorResponse(401, {
        code: 'invalid_api_key',
        message: 'Incorrect API key provided: sk-abc***xy1. Check your key.',
      }),
    log: (failure) => failures.push(failure),
  });

  const error = await generateAndCatch(client);

  expect(error.code).toBe('AI_AUTH_FAILED');
  expect(failures[0]?.status).toBe(401);
  expect(failures[0]?.provider_code).toBe('invalid_api_key');
  expect(failures[0]?.provider_message).toBeNull();
  expect(JSON.stringify(failures)).not.toContain('sk-abc');
});

test('redacts key-like values from non-authentication provider messages', async () => {
  const failures: AiFailure[] = [];
  const client = createAiClient(configuration, {
    fetch: async () => providerErrorResponse(400, { message: 'Request failed for sk-live-1234567890abcd; read\nmore' }),
    log: (failure) => failures.push(failure),
  });

  await generateAndCatch(client);

  expect(failures[0]?.provider_message).toBe('Request failed for [REDACTED]; read more');
  expect(JSON.stringify(failures)).not.toContain('sk-live-1234567890abcd');
});

test('maps a network or timeout failure to AI_UNAVAILABLE and records the cause', async () => {
  const failures: AiFailure[] = [];
  const client = createAiClient(configuration, {
    fetch: async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    },
    log: (failure) => failures.push(failure),
  });

  const error = await generateAndCatch(client);

  expect(error.code).toBe('AI_UNAVAILABLE');
  expect(error.statusCode).toBe(503);
  expect(error.message).not.toContain(configuration.api_key);
  expect(failures[0]).toEqual({
    endpoint: 'https://api.example.com/v1/chat/completions',
    kind: 'timeout',
    provider_code: null,
    provider_message: null,
    status: null,
  });
});

test('maps a connection failure to a network cause', async () => {
  const failures: AiFailure[] = [];
  const client = createAiClient(configuration, {
    fetch: async () => {
      throw new TypeError('fetch failed');
    },
    log: (failure) => failures.push(failure),
  });

  await generateAndCatch(client);

  expect(failures[0]?.kind).toBe('network');
});

test('maps malformed provider output to AI_INVALID_RESPONSE', async () => {
  for (const response of [
    providerResponse('not JSON'),
    new Response(JSON.stringify({ choices: [] }), { headers: { 'Content-Type': 'application/json' }, status: 200 }),
    new Response('not JSON', { headers: { 'Content-Type': 'application/json' }, status: 200 }),
  ]) {
    const client = createAiClient(configuration, { fetch: async () => response });
    const error = await generateAndCatch(client);

    expect(error.code).toBe('AI_INVALID_RESPONSE');
    expect(error.statusCode).toBe(503);
  }
});
