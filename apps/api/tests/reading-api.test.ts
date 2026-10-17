import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { testWebAuth } from './fixtures/auth';
import type {
  CreateReadingMaterialRequest,
  ReadingExpectedAnswer,
  ReadingMaterial,
  ReadingMaterialList,
  ReadingService,
  SaveReadingAnswersRequest,
  UpdateReadingMaterialRequest,
} from '../src/modules/reading/reading.types';
import type {
  ReadingSettingService,
  ReadingSettings,
  UpdateReadingSettingsRequest,
} from '../src/modules/reading/reading-setting/reading-setting.types';

type ReadingApiService = ReadingService & ReadingSettingService;

const settings: ReadingSettings = {
  default_level: 'A1',
  default_word_count: 300,
  default_question_count: 3,
  min_word_count: 250,
  max_word_count: 350,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const material: ReadingMaterial = {
  code: 'RD-20260905-001',
  title: 'A morning market',
  level: 'A1',
  genre: 'story',
  tags: ['daily-life'],
  reading_status: 'unread',
  created_at: '2026-09-05T10:00:00.000Z',
  updated_at: '2026-09-05T10:00:00.000Z',
  word_count: 8,
  content_text: 'Mira visits the market early every Sunday morning.',
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
      title: material.title,
      genre: material.genre,
      level: material.level,
      content_excerpt: material.content_text,
      tags: material.tags,
      reading_status: 'unread',
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ],
};

const createReadingServiceStub = (overrides: Partial<ReadingApiService> = {}): ReadingApiService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
  listMaterials: async () => materialList,
  getMaterial: async () => material,
  saveAnswers: async () => material,
  updateMaterial: async () => material,
  getExpectedAnswers: async () => expectedAnswers,
  ...overrides,
});

let activeReadingService = createReadingServiceStub();

mock.module('../src/modules/reading/reading-setting/reading-setting.service', () => ({
  getSettings: () => activeReadingService.getSettings(),
  updateSettings: (input: UpdateReadingSettingsRequest) => activeReadingService.updateSettings(input),
}));

mock.module('../src/modules/reading/reading.service', () => ({
  createMaterial: (input: CreateReadingMaterialRequest) => activeReadingService.createMaterial(input),
  listMaterials: (input: Parameters<ReadingApiService['listMaterials']>[0]) =>
    activeReadingService.listMaterials(input),
  getMaterial: (code: string) => activeReadingService.getMaterial(code),
  updateMaterial: (code: string, input: UpdateReadingMaterialRequest) =>
    activeReadingService.updateMaterial(code, input),
  saveAnswers: (code: string, input: SaveReadingAnswersRequest) => activeReadingService.saveAnswers(code, input),
  getExpectedAnswers: (code: string) => activeReadingService.getExpectedAnswers(code),
}));

const { createApp } = await import('../src/app');

const createReadingApp = (overrides: Partial<ReadingApiService> = {}) => {
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

test('lists reading materials with validated read-status filters and no pagination', async () => {
  let listInput: Parameters<ReadingApiService['listMaterials']>[0] | undefined;
  const response = await createReadingApp({
    listMaterials: async (input) => {
      listInput = input;
      return materialList;
    },
  }).request(
    'http://localhost/api/v1/reading/materials?q=market&reading_status=unread&levels=A1%2CB1&limit=20&sort=newest',
    { headers },
  );

  expect(response.status).toBe(200);
  expect(listInput).toEqual({
    q: 'market',
    reading_status: 'unread',
    levels: ['A1', 'B1'],
    limit: 20,
    sort: 'newest',
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(materialList) });
});

test('rejects removed status and pagination filters', async () => {
  const app = createReadingApp();
  for (const query of ['page=1', 'status=completed', 'level=B1']) {
    const response = await app.request(`http://localhost/api/v1/reading/materials?${query}`, { headers });
    expect(response.status).toBe(400);
  }
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
      title: material.title,
      level: material.level,
      genre: material.genre,
      tags: material.tags,
      target_word_count: 300,
      content_text: material.content_text,
      source: material.source,
      questions: expectedAnswers.map(({ question_text, expected_answer }) => ({
        question_text,
        expected_answer,
      })),
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput).toMatchObject({ title: material.title, content_text: material.content_text });
  expect(createInput?.questions).toEqual(
    expectedAnswers.map(({ question_text, expected_answer }) => ({ question_text, expected_answer })),
  );
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(material) });
});

test('rejects create requests that use only the former topic and passage_text names', async () => {
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
      topic: material.title,
      passage_text: material.content_text,
      level: material.level,
      genre: material.genre,
      target_word_count: 300,
      source: material.source,
      questions: expectedAnswers.map(({ question_text, expected_answer }) => ({ question_text, expected_answer })),
    }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('accepts material creation with omitted defaults and explicit zero questions', async () => {
  let createInput: CreateReadingMaterialRequest | undefined;
  const app = createReadingApp({
    createMaterial: async (input) => {
      createInput = input;
      return material;
    },
  });
  const response = await app.request('http://localhost/api/v1/reading/materials', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: material.title,
      content_text: material.content_text,
      genre: material.genre,
      source: 'request',
      target_question_count: 0,
    }),
  });
  expect(response.status).toBe(201);
  expect(createInput).toEqual({
    title: material.title,
    content_text: material.content_text,
    genre: material.genre,
    source: 'request',
    target_question_count: 0,
    questions: [],
    tags: [],
  });
});

test('passes partial and cleared reading answers to the service', async () => {
  let submissionInput: SaveReadingAnswersRequest | undefined;
  const answers = [
    { question_number: 1, user_answer: 'Mira' },
    { question_number: 2, user_answer: null },
  ];
  const response = await createReadingApp({
    saveAnswers: async (_code, input) => {
      submissionInput = input;
      return material;
    },
  }).request(`http://localhost/api/v1/reading/materials/${material.code}/answers`, {
    method: 'PATCH',
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

test('marks manual reading status through PATCH', async () => {
  let input: UpdateReadingMaterialRequest | undefined;
  const app = createReadingApp({
    updateMaterial: async (_code, value) => {
      input = value;
      return { ...material, reading_status: value.reading_status };
    },
  });
  const response = await app.request(`http://localhost/api/v1/reading/materials/${material.code}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ reading_status: 'read' }),
  });
  expect(response.status).toBe(200);
  expect(input).toEqual({ reading_status: 'read' });
  const invalid = await app.request(`http://localhost/api/v1/reading/materials/${material.code}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ reading_status: 'completed' }),
  });
  expect(invalid.status).toBe(400);
});
