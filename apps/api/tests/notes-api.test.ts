import { expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import type {
  CreateNoteRequest,
  ListNotesRequest,
  Note,
  NoteReferenceRequest,
  NotesService,
  UpdateNoteRequest,
} from '../src/modules/notes/notes.types';

const note: Note = {
  code: 'NT-20260726-001',
  title: 'Postgres advisory locks',
  content: 'Transaction advisory locks are released when the transaction ends.',
  type: 'fact',
  category: 'Tech/Programming',
  source: 'postgresql.org',
  sourceContext: null,
  sourceReference: null,
  tags: ['postgres', 'database'],
  createdAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T10:00:00.000Z',
  deletedAt: null,
};

const createNotesServiceStub = (overrides: Partial<NotesService> = {}): NotesService => ({
  create: async (input: CreateNoteRequest) => ({ ...note, ...input }),
  getDetail: async () => note,
  list: async () => [note],
  update: async (_request: NoteReferenceRequest, input: UpdateNoteRequest) => ({ ...note, ...input }),
  remove: async () => {},
  ...overrides,
});

let activeNotesService = createNotesServiceStub();

mock.module('../src/modules/notes/notes.service', () => ({
  create: (input: CreateNoteRequest) => activeNotesService.create(input),
  getDetail: (request: NoteReferenceRequest) => activeNotesService.getDetail(request),
  list: (input: ListNotesRequest) => activeNotesService.list(input),
  update: (request: NoteReferenceRequest, input: UpdateNoteRequest) => activeNotesService.update(request, input),
  remove: (request: NoteReferenceRequest) => activeNotesService.remove(request),
}));

const { createApp } = await import('../src/app');

const createNotesApp = (overrides: Partial<NotesService> = {}) => {
  activeNotesService = createNotesServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
};

test('creates a note through the authenticated API', async () => {
  const response = await createNotesApp().request('http://localhost/api/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Postgres advisory locks',
      content: 'Transaction advisory locks are released when the transaction ends.',
      type: 'fact',
      category: 'Tech/Programming',
      source: 'postgresql.org',
      tags: ['postgres', 'database'],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    success: true,
    data: toSnakeCaseJson(note),
  });
});

test('accepts an explicit General English save through Notes', async () => {
  let createInput: CreateNoteRequest | undefined;
  const response = await createNotesApp({
    create: async (input) => {
      createInput = input;
      return { ...note, ...input };
    },
  }).request('http://localhost/api/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Although vs even though',
      content: 'Both introduce contrast; even though is more emphatic.',
      type: 'fact',
      category: 'English',
      source_context: 'general_chat',
      source_reference: null,
      tags: ['english', 'grammar'],
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput).toMatchObject({ sourceContext: 'general_chat', sourceReference: null });
});

test('rejects an invalid note payload without calling the service', async () => {
  let createCalled = false;
  const app = createNotesApp({
    create: async () => {
      createCalled = true;
      return note;
    },
  });

  const response = await app.request('http://localhost/api/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: '', type: 'invalid' }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
  expect(await response.json()).toMatchObject({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
  });
});

test('rejects malformed JSON without calling the service', async () => {
  let createCalled = false;
  const app = createNotesApp({
    create: async () => {
      createCalled = true;
      return note;
    },
  });

  const response = await app.request('http://localhost/api/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: '{',
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
  expect(await response.json()).toMatchObject({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
  });
});

test('passes search filters to the notes service', async () => {
  let searchInput: ListNotesRequest | undefined;
  const app = createNotesApp({
    list: async (input) => {
      searchInput = input;
      return [note];
    },
  });

  const response = await app.request(
    'http://localhost/api/v1/notes?q=advisory&tag=postgres&category=Tech%2FProgramming&limit=10',
    { headers: { Authorization: 'Bearer test-api-key' } },
  );

  expect(response.status).toBe(200);
  expect(searchInput).toEqual({
    q: 'advisory',
    tag: 'postgres',
    category: 'Tech/Programming',
    limit: 10,
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: [note] }) });
});

test('returns the standard not-found response for an unknown note', async () => {
  const response = await createNotesApp({
    getDetail: async () => {
      throw new AppError({ code: 'NOTE_NOT_FOUND', statusCode: 404, message: 'Note not found' });
    },
  }).request('http://localhost/api/v1/notes/NT-20260726-001', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    success: false,
    error: { code: 'NOTE_NOT_FOUND', message: 'Note not found', details: null },
    request_id: expect.any(String),
  });
});

test('updates a note through its stable code', async () => {
  let updateInput: UpdateNoteRequest | undefined;
  const response = await createNotesApp({
    update: async (_reference, input) => {
      updateInput = input;
      return { ...note, ...input };
    },
  }).request('http://localhost/api/v1/notes/NT-20260726-001', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: 'Database', tags: ['postgres'] }),
  });

  expect(response.status).toBe(200);
  expect(updateInput).toEqual({ category: 'Database', tags: ['postgres'] });
});

test('soft deletes a note through the authenticated API', async () => {
  let removedCode: string | undefined;
  const response = await createNotesApp({
    remove: async ({ code }) => {
      removedCode = code;
    },
  }).request('http://localhost/api/v1/notes/NT-20260726-001', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(204);
  expect(removedCode).toBe('NT-20260726-001');
});
