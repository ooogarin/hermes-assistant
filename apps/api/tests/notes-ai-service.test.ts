import { afterEach, expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import type { AiClient, AiJsonRequest } from '../src/core/ai/ai.types';
import type { LinkMetadata } from '../src/core/link/link-metadata.types';
import type { CreateNoteRequest, Note } from '../src/modules/notes/notes.types';

const note: Note = {
  code: 'NT-20261114-001',
  title: 'PostgreSQL advisory locks',
  content_text: 'Advisory locks are released when the transaction ends.',
  raw_text: 'catatan postgres advisory lock https://example.com/lock',
  type: 'fact',
  category: 'tech/programming',
  source_name: 'Example Journal',
  source_url: 'https://example.com/lock',
  source_context: null,
  source_reference: null,
  tags: ['postgres', 'database'],
  created_at: '2026-11-14T10:00:00.000Z',
  updated_at: '2026-11-14T10:00:00.000Z',
};

let activeCategories: string[] = ['tech/programming', 'personal development'];
let activeTagVocabulary: string[] = ['postgres', 'database'];
let activeLinkMetadata: LinkMetadata | null = null;
let linkMetadataCalls = 0;
let createdRequests: CreateNoteRequest[] = [];

mock.module('../src/core/link/link-metadata', () => ({
  fetchLinkMetadata: async () => {
    linkMetadataCalls += 1;

    return activeLinkMetadata;
  },
}));

mock.module('../src/modules/notes/notes.service', () => ({
  create: async (input: CreateNoteRequest) => {
    createdRequests.push(input);

    return { ...note, ...input };
  },
  listCategories: async () => activeCategories,
  listTagVocabulary: async () => activeTagVocabulary,
}));

const { createWithAi } = await import('../src/modules/notes/notes-ai/notes-ai.service');

afterEach(() => {
  activeLinkMetadata = null;
  linkMetadataCalls = 0;
});

const createClient = (response: unknown): AiClient => ({
  generateJson: async () => response,
});

const captureError = async (operation: Promise<unknown>): Promise<AppError> => {
  try {
    await operation;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the AI create operation to fail.');
};

const aiMetadata = {
  title: 'PostgreSQL advisory locks',
  type: 'fact',
  category: 'tech/programming',
  content_text: 'Advisory locks are released when the transaction ends.',
  source_url: null,
  source_name: null,
  tags: ['postgres', 'database'],
};

test('creates the note immediately through the same service as Telegram', async () => {
  createdRequests = [];
  const rawText = '  catatan postgres advisory lock\nhttps://example.com/lock  ';

  const created = await createWithAi({ text: rawText }, createClient(aiMetadata));

  expect(created.code).toBe(note.code);
  expect(createdRequests).toHaveLength(1);
  expect(createdRequests[0]).toEqual({
    title: 'PostgreSQL advisory locks',
    content_text: 'Advisory locks are released when the transaction ends.',
    raw_text: rawText,
    type: 'fact',
    category: 'tech/programming',
    source_name: null,
    source_url: 'https://example.com/lock',
    source_context: null,
    source_reference: null,
    tags: ['postgres', 'database'],
  });
});

test('normalizes AI values, maps Indonesian types, and deduplicates tags', async () => {
  createdRequests = [];

  await createWithAi(
    { text: 'catatan https://Example.com/Post' },
    createClient({
      title: '  Judul Usulan  ',
      type: '  Fakta  ',
      category: '  Tech/Programming  ',
      content_text: '  Catatan singkat.  ',
      source_url: 'https://invented.example.com/other',
      source_name: '  Example Blog  ',
      tags: ['  Postgres ', 'postgres', 'DATABASE', '', '  '],
    }),
  );

  expect(createdRequests[0]).toMatchObject({
    title: 'Judul Usulan',
    type: 'fact',
    category: 'tech/programming',
    content_text: 'Catatan singkat.',
    source_url: 'https://Example.com/Post',
    source_name: 'Example Blog',
    tags: ['postgres', 'database'],
  });
});

test('uses fetched link metadata as facts and fills missing fields from it', async () => {
  activeLinkMetadata = {
    url: 'https://example.com/lock',
    title: 'PostgreSQL Advisory Locks',
    description: 'Penjelasan advisory lock PostgreSQL.',
    site_name: 'Example Journal',
    author: 'Jane Doe',
    type: 'article',
  };
  createdRequests = [];
  let capturedRequest: AiJsonRequest | undefined;
  const client: AiClient = {
    generateJson: async (request) => {
      capturedRequest = request;

      return {
        title: null,
        type: 'fact',
        category: 'tech/programming',
        content_text: null,
        source_url: null,
        source_name: null,
        tags: [],
      };
    },
  };

  await createWithAi({ text: 'artikel bagus soal advisory lock https://example.com/lock' }, client);

  expect(capturedRequest?.system_prompt).toContain('PostgreSQL Advisory Locks');
  expect(createdRequests[0]).toMatchObject({
    title: 'PostgreSQL Advisory Locks',
    content_text: 'Penjelasan advisory lock PostgreSQL.',
    source_url: 'https://example.com/lock',
    source_name: 'Example Journal',
  });
});

test('sends a prompt with the existing categories, tag vocabulary, and type rules', async () => {
  activeCategories = ['tech/programming', 'personal development'];
  activeTagVocabulary = ['postgres', 'fokus'];
  let capturedRequest: AiJsonRequest | undefined;
  const client: AiClient = {
    generateJson: async (request) => {
      capturedRequest = request;

      return aiMetadata;
    },
  };

  await createWithAi({ text: 'catatan' }, client);

  expect(capturedRequest?.system_prompt).toContain('"tech/programming"');
  expect(capturedRequest?.system_prompt).toContain('"postgres"');
  expect(capturedRequest?.system_prompt).toContain('fact, personal, news, quote, idea, reminder');
  expect(capturedRequest?.system_prompt).toContain('source_url: always null');
});

test('does not fetch link metadata when the message has no URL', async () => {
  linkMetadataCalls = 0;
  createdRequests = [];

  await createWithAi({ text: 'aku fokus lebih baik pagi' }, createClient(aiMetadata));

  expect(linkMetadataCalls).toBe(0);
  expect(createdRequests[0]?.source_url).toBeNull();
});

test('stores nothing and fails before calling the AI when the feature is not configured', async () => {
  createdRequests = [];

  const error = await captureError(createWithAi({ text: 'catatan' }, null));

  expect(error.code).toBe('AI_NOT_CONFIGURED');
  expect(createdRequests).toHaveLength(0);
});

test('stores nothing when the AI client fails', async () => {
  createdRequests = [];
  const client: AiClient = {
    generateJson: async () => {
      throw new AppError({ code: 'AI_RATE_LIMITED', statusCode: 503, message: 'Limited.' });
    },
  };

  const error = await captureError(createWithAi({ text: 'catatan' }, client));

  expect(error.code).toBe('AI_RATE_LIMITED');
  expect(createdRequests).toHaveLength(0);
});

test('rejects an unknown AI type instead of guessing one', async () => {
  createdRequests = [];

  const error = await captureError(
    createWithAi({ text: 'catatan' }, createClient({ ...aiMetadata, type: 'catatan harian' })),
  );

  expect(error.code).toBe('AI_INVALID_RESPONSE');
  expect(createdRequests).toHaveLength(0);
});

test('stores nothing and rejects AI output that does not match the metadata contract', async () => {
  createdRequests = [];

  for (const output of [
    { ...aiMetadata, category: '' },
    { ...aiMetadata, tags: 'postgres' },
    { ...aiMetadata, title: 42 },
  ]) {
    const error = await captureError(createWithAi({ text: 'catatan' }, createClient(output)));

    expect(error.code).toBe('AI_INVALID_RESPONSE');
  }

  expect(createdRequests).toHaveLength(0);
});

test('keeps at most six lowercase valid tags', async () => {
  createdRequests = [];

  await createWithAi(
    { text: 'catatan' },
    createClient({
      ...aiMetadata,
      tags: ['A', 'b', 'A', 'c', 'd', 'e', 'f', 'g', 'h'.repeat(65)],
    }),
  );

  expect(createdRequests[0]?.tags).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
});
