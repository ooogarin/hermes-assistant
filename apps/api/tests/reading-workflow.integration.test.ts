import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app';
import { configureDatabaseClient } from '../src/core/database/client';
import { loadMigrations, migrateDatabase } from '../src/core/database/migration-runner';
import { testWebAuth } from './fixtures/auth';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';
import type { ReadingMaterial, ReadingMaterialList } from '../src/modules/reading/reading.types';
import type { ReadingSettings } from '../src/modules/reading/reading-setting/reading-setting.types';

const materialInput = {
  title: 'Remote work habits',
  content_text: 'Remote work helps people focus.\n\nA quiet space is useful.',
  genre: 'article',
  source: 'request',
  tags: ['work'],
  questions: [1, 2, 3].map((n) => ({ question_text: `Question ${n}`, expected_answer: `Reference ${n}` })),
};
const headers = { Authorization: 'Bearer reading-integration-key', 'Content-Type': 'application/json' };
const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));

describe.skipIf(!hasTestDatabaseUrl)('Reading workflow HTTP and PostgreSQL integration', () => {
  let database: DatabaseClient;
  const app = createApp({
    webAuth: testWebAuth,
    internalApiKey: 'reading-integration-key',
    isDatabaseReady: async () => true,
  });
  const request = (path: string, method = 'GET', body?: unknown) =>
    app.request(`http://localhost/api/v1/reading/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const create = async (overrides: Record<string, unknown> = {}): Promise<ReadingMaterial> => {
    const response = await request('materials', 'POST', { ...materialInput, ...overrides });
    expect(response.status).toBe(201);
    const payload = (await response.json()) as { data: ReadingMaterial };
    return payload.data;
  };
  const detail = async (code: string): Promise<ReadingMaterial> => {
    const response = await request(`materials/${code}`);
    return ((await response.json()) as { data: ReadingMaterial }).data;
  };
  const save = (code: string, answers: unknown[]) => request(`materials/${code}/answers`, 'PATCH', { answers });

  beforeAll(async () => {
    database = createTestDatabaseClient();
    configureDatabaseClient(database);
    await resetTestDatabase(database);
    await migrateDatabase(database, await loadMigrations(migrationDirectory));
  });
  beforeEach(async () => {
    await database`TRUNCATE reading_answers, reading_submissions, reading_questions, reading_materials RESTART IDENTITY CASCADE`;
    await database`UPDATE reading_settings SET default_level = 'A1', default_word_count = 300,
      min_word_count = 250, max_word_count = 350, default_question_count = 3`;
  });
  afterAll(async () => {
    if (database) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('resolves omitted defaults, preserves explicit zero and stored snapshots, and validates supplied question counts', async () => {
    const settings = await request('settings', 'PATCH', {
      default_level: 'B1',
      default_word_count: 450,
      min_word_count: 400,
      max_word_count: 500,
      default_question_count: 2,
    });
    expect(settings.status).toBe(200);
    expect(((await settings.json()) as { data: ReadingSettings }).data.default_question_count).toBe(2);
    const material = await create({ questions: materialInput.questions.slice(0, 2) });
    expect(material).toMatchObject({
      level: 'B1',
      is_override: false,
      reading_status: 'unread',
    });
    const [storedSnapshot] = await database<
      { target_word_count: number; target_question_count: number }[]
    >`SELECT target_word_count, target_question_count FROM reading_materials WHERE code = ${material.code}`;
    expect(storedSnapshot).toEqual({ target_word_count: 450, target_question_count: 2 });
    const readingOnly = await create({
      level: 'C1',
      target_word_count: 100,
      target_question_count: 0,
      questions: undefined,
    });
    expect(readingOnly).toMatchObject({
      level: 'C1',
      is_override: true,
      questions: [],
    });
    const [storedReadingOnly] = await database<
      { target_word_count: number; target_question_count: number }[]
    >`SELECT target_word_count, target_question_count FROM reading_materials WHERE code = ${readingOnly.code}`;
    expect(storedReadingOnly).toEqual({ target_word_count: 100, target_question_count: 0 });
    await request('settings', 'PATCH', { default_question_count: 0 });
    const [snapshotAfterSettingsChange] = await database<{ target_question_count: number }[]>`
      SELECT target_question_count FROM reading_materials WHERE code = ${material.code}
    `;
    expect(snapshotAfterSettingsChange?.target_question_count).toBe(2);
    const fromDefault = await create({ questions: undefined });
    expect(fromDefault.questions).toEqual([]);
    expect(fromDefault.is_override).toBe(false);
    expect((await request('materials', 'POST', materialInput)).status).toBe(400);
    expect((await request('settings', 'PATCH', { default_question_count: 21 })).status).toBe(400);
    expect((await request('settings', 'PATCH', { default_question_count: -1 })).status).toBe(400);
    expect((await request('settings', 'PATCH', { default_question_count: 0.5 })).status).toBe(400);
  });

  test('stores partial, corrected, cleared and reactivated answers without changing manual read status', async () => {
    const material = await create();
    const partial = await save(material.code, [{ question_number: 1, user_answer: '  First answer  ' }]);
    expect(partial.status).toBe(200);
    expect((await detail(material.code)).questions.map((q) => q.user_answer)).toEqual(['First answer', null, null]);
    expect((await detail(material.code)).reading_status).toBe('unread');
    await request(`materials/${material.code}`, 'PATCH', { reading_status: 'read' });
    await save(material.code, [{ question_number: 2, user_answer: 'Second answer' }]);
    expect((await detail(material.code)).questions.map((q) => q.user_answer)).toEqual([
      'First answer',
      'Second answer',
      null,
    ]);
    await save(material.code, [{ question_number: 1, user_answer: null }]);
    expect((await detail(material.code)).questions.map((q) => q.user_answer)).toEqual([null, 'Second answer', null]);
    await save(material.code, [{ question_number: 1, user_answer: 'Corrected answer' }]);
    expect((await detail(material.code)).questions.map((q) => q.user_answer)).toEqual([
      'Corrected answer',
      'Second answer',
      null,
    ]);
    expect((await detail(material.code)).reading_status).toBe('read');
    const [counts] = await database<{ groups: number; answers: number }[]>`SELECT
      (SELECT COUNT(*)::INTEGER FROM reading_submissions) AS groups,
      (SELECT COUNT(*)::INTEGER FROM reading_answers) AS answers`;
    expect(counts).toEqual({ groups: 1, answers: 2 });
    await request(`materials/${material.code}`, 'PATCH', { reading_status: 'unread' });
    expect((await detail(material.code)).reading_status).toBe('unread');
    expect((await detail(material.code)).questions[0]?.user_answer).toBe('Corrected answer');
  });

  test('creates no answer group for reading-only material, empty saves, or clears of unanswered questions', async () => {
    const material = await create({ target_question_count: 0, questions: [] });
    expect((await save(material.code, [])).status).toBe(200);
    expect((await save(material.code, [{ question_number: 1, user_answer: 'No question' }])).status).toBe(400);
    await request(`materials/${material.code}`, 'PATCH', { reading_status: 'read' });
    const references = await request(`materials/${material.code}/expected-answers`);
    expect(await references.json()).toMatchObject({ data: { items: [] } });
    const withQuestions = await create();
    expect((await save(withQuestions.code, [{ question_number: 1, user_answer: null }])).status).toBe(200);
    const [counts] = await database<{ groups: number; answers: number }[]>`SELECT
      (SELECT COUNT(*)::INTEGER FROM reading_submissions) AS groups, (SELECT COUNT(*)::INTEGER FROM reading_answers) AS answers`;
    expect(counts).toEqual({ groups: 0, answers: 0 });
  });

  test('rejects duplicate, unknown and foreign question numbers atomically and hides reference answers', async () => {
    const material = await create();
    const foreign = await create({
      target_question_count: 5,
      questions: Array.from({ length: 5 }, (_, n) => ({
        question_text: `Other ${n}`,
        expected_answer: 'Secret reference',
      })),
    });
    for (const answers of [
      [
        { question_number: 1, user_answer: 'A' },
        { question_number: 1, user_answer: 'B' },
      ],
      [
        { question_number: 1, user_answer: 'A' },
        { question_number: 5, user_answer: 'Foreign' },
      ],
      [{ question_number: 2, user_answer: '' }],
    ])
      expect((await save(material.code, answers)).status).toBe(400);
    expect((await detail(material.code)).questions.every((q) => q.user_answer === null)).toBe(true);
    expect(JSON.stringify(await detail(foreign.code))).not.toContain('expected_answer');
    const references = await request(`materials/${material.code}/expected-answers`);
    expect(JSON.stringify(await references.json())).toContain('Reference 1');
    expect((await detail(material.code)).reading_status).toBe('unread');
    expect((await request(`materials/${material.code}`, 'PATCH', { reading_status: 'completed' })).status).toBe(400);
    await database`UPDATE reading_materials SET deleted_at = NOW() WHERE code = ${material.code}`;
    expect((await save(material.code, [])).status).toBe(404);
    expect((await request(`materials/${material.code}`, 'PATCH', { reading_status: 'read' })).status).toBe(404);
  });

  test('serializes concurrent partial saves in one active group without losing omitted answers', async () => {
    const material = await create();
    const results = await Promise.all([
      save(material.code, [{ question_number: 1, user_answer: 'First' }]),
      save(material.code, [{ question_number: 2, user_answer: 'Second' }]),
    ]);
    expect(results.map((response) => response.status)).toEqual([200, 200]);
    expect((await detail(material.code)).questions.map((q) => q.user_answer)).toEqual(['First', 'Second', null]);
    const [row] = await database<{ count: number }[]>`SELECT COUNT(*)::INTEGER AS count FROM reading_submissions`;
    expect(row?.count).toBe(1);
  });

  test('filters and orders before the list limit and returns only items without legacy metadata', async () => {
    const first = await create({ title: 'First reading', tags: ['work'], content_text: 'One.\n\nTwo.' });
    const second = await create({ title: 'Second reading', genre: 'story', tags: ['work'] });
    await create({ title: 'Unrelated reading', tags: ['home'] });
    await request(`materials/${second.code}`, 'PATCH', { reading_status: 'read' });
    const response = await request('materials?q=work&reading_status=unread&levels=A1&sort=oldest&limit=1');
    const data = ((await response.json()) as { data: ReadingMaterialList }).data;
    expect(Object.keys(data)).toEqual(['items']);
    expect(data.items.map((item) => item.code)).toEqual([first.code]);
    expect(data.items[0]?.content_excerpt).toBe('One. Two.');
    expect(Object.keys(data.items[0] ?? {}).sort()).toEqual(
      ['code', 'title', 'content_excerpt', 'genre', 'level', 'tags', 'reading_status', 'created_at'].sort(),
    );
    const read = await request('materials?reading_status=read');
    expect(((await read.json()) as { data: ReadingMaterialList }).data.items.map((item) => item.code)).toEqual([
      second.code,
    ]);
    expect((await request('materials?page=1')).status).toBe(400);
    expect((await request('materials?status=completed')).status).toBe(400);
  });
});
