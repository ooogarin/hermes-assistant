import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { testWebAuth } from './fixtures/auth';
import type {
  CreateReadingMaterialRequest,
  ReadingExpectedAnswer,
  ReadingMaterial,
  ReadingMaterialList,
  ReadingService,
  ReadingSettings,
  SaveReadingSubmissionRequest,
  UpdateReadingSettingsRequest,
} from '../src/modules/reading/reading.types';

const settings: ReadingSettings = {
  default_level: 'A1',
  default_word_count: 300,
  min_word_count: 250,
  max_word_count: 350,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const material: ReadingMaterial = {
  code: 'RD-20260905-001',
  topic: 'A morning market',
  level: 'A1',
  genre: 'story',
  tags: ['daily-life'],
  target_word_count: 300,
  word_count: 8,
  passage_text: 'Mira visits the market early every Sunday morning.',
  is_override: false,
  source: 'request',
  questions: [
    { question_number: 1, question_text: 'Who visits the market?', user_answer: null },
    { question_number: 2, question_text: 'When does Mira visit?', user_answer: null },
    { question_number: 3, question_text: 'Where does Mira go?', user_answer: null },
  ],
};

const expectedAnswers: ReadingExpectedAnswer[] = [
  { question_number: 1, question_text: 'Who visits the market?', expected_answer: 'Mira.' },
  { question_number: 2, question_text: 'When does Mira visit?', expected_answer: 'Every Sunday morning.' },
  { question_number: 3, question_text: 'Where does Mira go?', expected_answer: 'The market.' },
];

const materialList: ReadingMaterialList = {
  items: [
    {
      code: material.code,
      topic: material.topic,
      genre: material.genre,
      level: material.level,
      target_word_count: material.target_word_count,
      word_count: material.word_count,
      tags: material.tags,
      source: material.source,
      status: 'unanswered',
      question_count: material.questions.length,
      answered_question_count: 0,
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

const createReadingServiceStub = (overrides: Partial<ReadingService> = {}): ReadingService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
  listMaterials: async () => materialList,
  getMaterial: async () => material,
  saveSubmission: async () => material,
  getExpectedAnswers: async () => expectedAnswers,
  ...overrides,
});

let activeReadingService = createReadingServiceStub();

mock.module('../src/modules/reading/reading.service', () => ({
  getSettings: () => activeReadingService.getSettings(),
  updateSettings: (input: UpdateReadingSettingsRequest) => activeReadingService.updateSettings(input),
  createMaterial: (input: CreateReadingMaterialRequest) => activeReadingService.createMaterial(input),
  listMaterials: (input: Parameters<ReadingService['listMaterials']>[0]) => activeReadingService.listMaterials(input),
  getMaterial: (code: string) => activeReadingService.getMaterial(code),
  saveSubmission: (code: string, input: SaveReadingSubmissionRequest) =>
    activeReadingService.saveSubmission(code, input),
  getExpectedAnswers: (code: string) => activeReadingService.getExpectedAnswers(code),
}));

const { createApp } = await import('../src/app');

const createReadingApp = (overrides: Partial<ReadingService> = {}) => {
  activeReadingService = createReadingServiceStub(overrides);

  return createApp({ webAuth: testWebAuth, internalApiKey: 'test-api-key', isDatabaseReady: async () => true });
};

const headers = {
  Authorization: 'Bearer test-api-key',
  'Content-Type': 'application/json',
};

test('reads and updates reading settings', async () => {
  let updateInput: UpdateReadingSettingsRequest | undefined;
  const app = createReadingApp({
    updateSettings: async (input) => {
      updateInput = input;
      return { ...settings, default_level: input.default_level ?? settings.default_level };
    },
  });

  const getResponse = await app.request('http://localhost/api/v1/reading/settings', { headers });
  const patchResponse = await app.request('http://localhost/api/v1/reading/settings', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ default_level: 'B1' }),
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(settings) });
  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ default_level: 'B1' });
});

test('lists reading materials with validated filters and pagination', async () => {
  let listInput: Parameters<ReadingService['listMaterials']>[0] | undefined;
  const response = await createReadingApp({
    listMaterials: async (input) => {
      listInput = input;
      return materialList;
    },
  }).request(
    'http://localhost/api/v1/reading/materials?q=market&status=unanswered&levels=A1%2CB1&page=1&limit=20&sort=newest',
    { headers },
  );

  expect(response.status).toBe(200);
  expect(listInput).toEqual({
    q: 'market',
    status: 'unanswered',
    levels: ['A1', 'B1'],
    page: 1,
    limit: 20,
    sort: 'newest',
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(materialList) });
});

test('normalizes the legacy reading level filter and rejects ambiguous level filters', async () => {
  let listInput: Parameters<ReadingService['listMaterials']>[0] | undefined;
  const app = createReadingApp({
    listMaterials: async (input) => {
      listInput = input;
      return materialList;
    },
  });

  const legacyResponse = await app.request('http://localhost/api/v1/reading/materials?level=B1', { headers });
  const ambiguousResponse = await app.request('http://localhost/api/v1/reading/materials?level=A1&levels=B1', {
    headers,
  });

  expect(legacyResponse.status).toBe(200);
  expect(listInput).toMatchObject({ levels: ['B1'] });
  expect(ambiguousResponse.status).toBe(400);
});

test('creates a reading material without exposing expected answers', async () => {
  let createInput: CreateReadingMaterialRequest | undefined;
  const response = await createReadingApp({
    createMaterial: async (input) => {
      createInput = input;
      return material;
    },
  }).request('http://localhost/api/v1/reading/materials', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic: material.topic,
      level: material.level,
      genre: material.genre,
      tags: material.tags,
      target_word_count: material.target_word_count,
      passage_text: material.passage_text,
      source: material.source,
      questions: expectedAnswers.map(({ question_text, expected_answer }) => ({
        question_text,
        expected_answer,
      })),
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput?.questions).toEqual(
    expectedAnswers.map(({ question_text, expected_answer }) => ({ question_text, expected_answer })),
  );
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(material) });
});

test('rejects a reading material with fewer than three questions', async () => {
  let createCalled = false;
  const response = await createReadingApp({
    createMaterial: async () => {
      createCalled = true;
      return material;
    },
  }).request('http://localhost/api/v1/reading/materials', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic: material.topic,
      level: material.level,
      genre: material.genre,
      target_word_count: material.target_word_count,
      passage_text: material.passage_text,
      source: material.source,
      questions: expectedAnswers.slice(0, 2).map(({ question_text, expected_answer }) => ({
        question_text,
        expected_answer,
      })),
    }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('passes a complete reading submission to the service', async () => {
  let submissionInput: SaveReadingSubmissionRequest | undefined;
  const answers = expectedAnswers.map(({ question_number }) => ({ question_number, user_answer: 'Answer' }));
  const response = await createReadingApp({
    saveSubmission: async (_code, input) => {
      submissionInput = input;
      return material;
    },
  }).request(`http://localhost/api/v1/reading/materials/${material.code}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: answers.map(({ question_number, user_answer }) => ({
        question_number,
        user_answer,
      })),
    }),
  });

  expect(response.status).toBe(200);
  expect(submissionInput).toEqual({ answers });
});

test('returns expected answers through the dedicated endpoint', async () => {
  const response = await createReadingApp().request(
    `http://localhost/api/v1/reading/materials/${material.code}/expected-answers`,
    { headers },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: expectedAnswers }) });
});

test('validates reading material codes before calling the service', async () => {
  let getCalled = false;
  const response = await createReadingApp({
    getMaterial: async () => {
      getCalled = true;
      return material;
    },
  }).request('http://localhost/api/v1/reading/materials/not-a-code', { headers });

  expect(response.status).toBe(400);
  expect(getCalled).toBe(false);
});
