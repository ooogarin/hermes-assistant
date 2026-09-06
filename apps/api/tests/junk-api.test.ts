import { expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import type {
  CreateJunkRequest,
  JunkItem,
  JunkReferenceRequest,
  JunkService,
  ListJunkRequest,
  UpdateJunkRequest,
} from '../src/modules/junk/junk.types';

const junkItem: JunkItem = {
  code: 'JK-20260905-001',
  title: 'Rust ownership article',
  category: 'article',
  rawText: 'Artikel bagus soal Rust https://example.com/rust-ownership',
  contentText: 'Article about Rust ownership. User note: artikel bagus soal Rust.',
  sourceUrl: 'https://example.com/rust-ownership',
  tags: ['rust', 'programming'],
  createdAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:00.000Z',
  deletedAt: null,
};

const createJunkServiceStub = (overrides: Partial<JunkService> = {}): JunkService => ({
  create: async (input: CreateJunkRequest) => ({ ...junkItem, ...input }),
  getDetail: async () => junkItem,
  list: async () => [junkItem],
  update: async (_reference: JunkReferenceRequest, input: UpdateJunkRequest) => ({ ...junkItem, ...input }),
  remove: async () => {},
  ...overrides,
});

let activeJunkService = createJunkServiceStub();

mock.module('../src/modules/junk/junk.service', () => ({
  create: (input: CreateJunkRequest) => activeJunkService.create(input),
  getDetail: (request: JunkReferenceRequest) => activeJunkService.getDetail(request),
  list: (input: ListJunkRequest) => activeJunkService.list(input),
  update: (request: JunkReferenceRequest, input: UpdateJunkRequest) => activeJunkService.update(request, input),
  remove: (request: JunkReferenceRequest) => activeJunkService.remove(request),
}));

const { createApp } = await import('../src/app');

const createJunkApp = (overrides: Partial<JunkService> = {}) => {
  activeJunkService = createJunkServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
};

test('creates a junk item through the authenticated API', async () => {
  const response = await createJunkApp().request('http://localhost/api/v1/junk', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Rust ownership article',
      category: 'article',
      rawText: 'Artikel bagus soal Rust https://example.com/rust-ownership',
      contentText: 'Article about Rust ownership. User note: artikel bagus soal Rust.',
      sourceUrl: 'https://example.com/rust-ownership',
      tags: ['rust', 'programming'],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(junkItem) });
});

test('rejects an invalid junk payload without calling the service', async () => {
  let createCalled = false;
  const app = createJunkApp({
    create: async () => {
      createCalled = true;
      return junkItem;
    },
  });

  const response = await app.request('http://localhost/api/v1/junk', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: '', source_url: 'not-a-url' }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
  expect(await response.json()).toMatchObject({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
  });
});

test('passes search filters to the junk service', async () => {
  let searchInput: ListJunkRequest | undefined;
  const app = createJunkApp({
    list: async (input) => {
      searchInput = input;
      return [junkItem];
    },
  });

  const response = await app.request(
    'http://localhost/api/v1/junk?q=rust&tag=programming&category=article&sourceUrl=https%3A%2F%2Fexample.com%2Frust-ownership&limit=10',
    { headers: { Authorization: 'Bearer test-api-key' } },
  );

  expect(response.status).toBe(200);
  expect(searchInput).toEqual({
    q: 'rust',
    tag: 'programming',
    category: 'article',
    sourceUrl: 'https://example.com/rust-ownership',
    limit: 10,
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: [junkItem] }) });
});

test('returns the standard not-found response for an unknown junk item', async () => {
  const response = await createJunkApp({
    getDetail: async () => {
      throw new AppError({ code: 'JUNK_ITEM_NOT_FOUND', statusCode: 404, message: 'Junk item not found' });
    },
  }).request('http://localhost/api/v1/junk/JK-20260905-001', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    success: false,
    error: { code: 'JUNK_ITEM_NOT_FOUND', message: 'Junk item not found', details: null },
    request_id: expect.any(String),
  });
});

test('updates junk metadata without allowing raw text replacement', async () => {
  let updateInput: UpdateJunkRequest | undefined;
  const response = await createJunkApp({
    update: async (_reference, input) => {
      updateInput = input;
      return { ...junkItem, ...input };
    },
  }).request('http://localhost/api/v1/junk/JK-20260905-001', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: 'reference', tags: ['rust'] }),
  });

  expect(response.status).toBe(200);
  expect(updateInput).toEqual({ category: 'reference', tags: ['rust'] });
});

test('soft deletes a junk item through the authenticated API', async () => {
  let removedCode: string | undefined;
  const response = await createJunkApp({
    remove: async ({ code }) => {
      removedCode = code;
    },
  }).request('http://localhost/api/v1/junk/JK-20260905-001', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(204);
  expect(removedCode).toBe('JK-20260905-001');
});
