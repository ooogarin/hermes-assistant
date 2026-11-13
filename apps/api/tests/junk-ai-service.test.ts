import { afterEach, expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import type { AiClient, AiJsonRequest } from '../src/core/ai/ai.types';
import type { LinkMetadata } from '../src/core/link/link-metadata.types';
import type { CreateJunkRequest, JunkItem } from '../src/modules/junk/junk.types';

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

let activeCategories: string[] = ['article', 'music'];
let activeTagVocabulary: string[] = ['rust', 'programming'];
let activeLinkMetadata: LinkMetadata | null = null;
let linkMetadataCalls = 0;
let createdRequests: CreateJunkRequest[] = [];

mock.module('../src/core/link/link-metadata', () => ({
  fetchLinkMetadata: async () => {
    linkMetadataCalls += 1;

    return activeLinkMetadata;
  },
}));

mock.module('../src/modules/junk/junk.service', () => ({
  create: async (input: CreateJunkRequest) => {
    createdRequests.push(input);

    return { ...junkItem, ...input };
  },
  listCategories: async () => activeCategories,
  listTagVocabulary: async () => activeTagVocabulary,
}));

const { createWithAi } = await import('../src/modules/junk/junk-ai/junk-ai.service');

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
  title: 'Rust ownership article',
  category: 'article',
  content_text: 'Article about Rust ownership.',
  source_url: null,
  source_name: null,
  tags: ['rust', 'programming'],
};

test('creates the junk item immediately through the same service as Telegram', async () => {
  createdRequests = [];
  const rawText = '  artikel bagus soal rust\nhttps://example.com/rust  ';

  const item = await createWithAi({ text: rawText }, createClient(aiMetadata));

  expect(item.code).toBe(junkItem.code);
  expect(createdRequests).toHaveLength(1);
  expect(createdRequests[0]).toEqual({
    title: 'Rust ownership article',
    category: 'article',
    raw_text: rawText,
    content_text: 'Article about Rust ownership.',
    source_url: 'https://example.com/rust',
    source_name: null,
    tags: ['rust', 'programming'],
  });
});

test('normalizes AI values, maps Indonesian categories, and deduplicates tags', async () => {
  createdRequests = [];

  await createWithAi(
    { text: 'catatan https://Example.com/Post' },
    createClient({
      title: '  Judul Usulan  ',
      category: '  Artikel  ',
      content_text: '  Catatan singkat.  ',
      source_url: 'https://invented.example.com/other',
      source_name: '  Example Blog  ',
      tags: ['  Rust ', 'rust', 'PROGRAMMING', '', '  '],
    }),
  );

  expect(createdRequests[0]).toMatchObject({
    title: 'Judul Usulan',
    category: 'article',
    content_text: 'Catatan singkat.',
    source_url: 'https://Example.com/Post',
    source_name: 'Example Blog',
    tags: ['rust', 'programming'],
  });
});

test('extracts the first URL from the raw text and ignores the AI URL', async () => {
  const cases: Array<{ expected: string | null; rawText: string }> = [
    { expected: 'https://example.com/article', rawText: 'lihat https://example.com/article bagus' },
    {
      expected: 'https://example.com/article',
      rawText: 'baca (https://example.com/article).',
    },
    {
      expected: 'https://example.com/article',
      rawText: 'ini [artikel](https://example.com/article) menarik',
    },
    { expected: null, rawText: 'artikel tanpa tautan sama sekali' },
  ];

  for (const testCase of cases) {
    createdRequests = [];

    await createWithAi(
      { text: testCase.rawText },
      createClient({ ...aiMetadata, source_url: 'https://invented.example.com/url' }),
    );

    expect(createdRequests[0]?.source_url).toBe(testCase.expected);
  }
});

test('keeps a practical new category only when no shared or existing category fits', async () => {
  const cases: Array<{ category: string; expected: string }> = [
    { category: 'Artikel', expected: 'article' },
    { category: 'musik', expected: 'music' },
    { category: 'Reference', expected: 'reference' },
    { category: 'pemrograman', expected: 'pemrograman' },
    { category: 'Articles', expected: 'article' },
  ];

  for (const testCase of cases) {
    createdRequests = [];

    await createWithAi({ text: 'catatan' }, createClient({ ...aiMetadata, category: testCase.category }));

    expect(createdRequests[0]?.category).toBe(testCase.expected);
  }
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

test('uses null values and empty tags when the AI omits nullable fields', async () => {
  createdRequests = [];

  await createWithAi({ text: 'quote: do or do not, there is no try' }, createClient({ category: 'Quote' }));

  expect(createdRequests[0]).toMatchObject({
    title: null,
    category: 'quote',
    content_text: null,
    source_url: null,
    source_name: null,
    tags: [],
  });
});

test('uses fetched link metadata as facts and fills missing fields from it', async () => {
  activeLinkMetadata = {
    url: 'https://www.youtube.com/watch?v=abc',
    title: 'Nadin Amizah - Sorai (Official Music Video)',
    description: 'Video musik resmi Sorai dari Nadin Amizah.',
    site_name: 'YouTube',
    author: 'Nadin Amizah',
    type: 'video',
  };
  createdRequests = [];
  let capturedRequest: AiJsonRequest | undefined;
  const client: AiClient = {
    generateJson: async (request) => {
      capturedRequest = request;

      return {
        title: null,
        category: 'music',
        content_text: null,
        source_url: null,
        source_name: null,
        tags: ['musik'],
      };
    },
  };

  await createWithAi(
    { text: 'Cari tahu tentang lagu di URL https://www.youtube.com/watch?v=abc ini, lalu rapikan.' },
    client,
  );

  expect(capturedRequest?.system_prompt).toContain('Nadin Amizah - Sorai');
  expect(capturedRequest?.system_prompt).toContain('URL metadata: {"url"');
  expect(createdRequests[0]).toMatchObject({
    title: 'Nadin Amizah - Sorai (Official Music Video)',
    category: 'music',
    content_text: 'Video musik resmi Sorai dari Nadin Amizah.',
    source_url: 'https://www.youtube.com/watch?v=abc',
    source_name: 'YouTube',
  });
});

test('does not fetch link metadata when the message has no URL', async () => {
  linkMetadataCalls = 0;
  createdRequests = [];

  await createWithAi({ text: 'catatan tanpa tautan' }, createClient({ ...aiMetadata, source_url: null }));

  expect(linkMetadataCalls).toBe(0);
  expect(createdRequests[0]?.source_url).toBeNull();
});

test('sends a prompt with the shared categories, tag vocabulary, and few-shot examples', async () => {
  activeCategories = ['article', 'quote'];
  activeTagVocabulary = ['rust', 'programming'];
  let capturedRequest: AiJsonRequest | undefined;
  const client: AiClient = {
    generateJson: async (request) => {
      capturedRequest = request;

      return aiMetadata;
    },
  };

  await createWithAi({ text: 'artikel bagus soal rust' }, client);

  const systemPrompt = capturedRequest?.system_prompt ?? '';
  expect(capturedRequest?.user_prompt).toBe('artikel bagus soal rust');
  expect(systemPrompt).toContain('"article"');
  expect(systemPrompt).toContain('"quote"');
  expect(systemPrompt).toContain('["rust","programming"]');
  expect(systemPrompt).toContain('source_url: always null');
  expect(systemPrompt).toContain('URL metadata: none');
  expect(systemPrompt).toContain('Examples:');
  expect(systemPrompt).toContain('never its topic');
});

test('stores nothing and fails before calling the AI when the feature is not configured', async () => {
  createdRequests = [];

  const error = await captureError(createWithAi({ text: 'hello' }, null));

  expect(error.code).toBe('AI_NOT_CONFIGURED');
  expect(error.statusCode).toBe(503);
  expect(createdRequests).toHaveLength(0);
});

test('stores nothing when the AI client fails', async () => {
  createdRequests = [];
  const client: AiClient = {
    generateJson: async () => {
      throw new AppError({ code: 'AI_UNAVAILABLE', statusCode: 503, message: 'AI service is unavailable.' });
    },
  };

  const error = await captureError(createWithAi({ text: 'hello' }, client));

  expect(error.code).toBe('AI_UNAVAILABLE');
  expect(error.statusCode).toBe(503);
  expect(createdRequests).toHaveLength(0);
});

test('stores nothing and rejects AI output that does not match the metadata contract', async () => {
  for (const output of [
    null,
    'not an object',
    {},
    { ...aiMetadata, category: '' },
    { ...aiMetadata, unexpected: true },
    { ...aiMetadata, tags: 'rust' },
    { ...aiMetadata, title: 42 },
  ]) {
    createdRequests = [];

    const error = await captureError(createWithAi({ text: 'hello' }, createClient(output)));

    expect(error.code).toBe('AI_INVALID_RESPONSE');
    expect(error.statusCode).toBe(503);
    expect(createdRequests).toHaveLength(0);
  }
});
