import { expect, mock, test } from 'bun:test';
import type {
  CreateReadingMaterialRequest,
  ReadingExpectedAnswer,
  ReadingMaterial,
  ReadingService,
  ReadingSettings,
  SaveReadingSubmissionRequest,
  UpdateReadingSettingsRequest,
} from '../src/modules/reading/reading.types';

const settings: ReadingSettings = {
  defaultLevel: 'A1',
  defaultWordCount: 300,
  minWordCount: 250,
  maxWordCount: 350,
  updatedAt: '2026-09-05T10:00:00.000Z',
};

const material: ReadingMaterial = {
  code: 'RD-20260905-001',
  topic: 'A morning market',
  level: 'A1',
  genre: 'story',
  tags: ['daily-life'],
  targetWordCount: 300,
  wordCount: 8,
  passageText: 'Mira visits the market early every Sunday morning.',
  isOverride: false,
  source: 'request',
  questions: [
    { questionNumber: 1, questionText: 'Who visits the market?', userAnswer: null },
    { questionNumber: 2, questionText: 'When does Mira visit?', userAnswer: null },
    { questionNumber: 3, questionText: 'Where does Mira go?', userAnswer: null },
  ],
};

const expectedAnswers: ReadingExpectedAnswer[] = [
  { questionNumber: 1, questionText: 'Who visits the market?', expectedAnswer: 'Mira.' },
  { questionNumber: 2, questionText: 'When does Mira visit?', expectedAnswer: 'Every Sunday morning.' },
  { questionNumber: 3, questionText: 'Where does Mira go?', expectedAnswer: 'The market.' },
];

const createReadingServiceStub = (overrides: Partial<ReadingService> = {}): ReadingService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
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
  getMaterial: (code: string) => activeReadingService.getMaterial(code),
  saveSubmission: (code: string, input: SaveReadingSubmissionRequest) =>
    activeReadingService.saveSubmission(code, input),
  getExpectedAnswers: (code: string) => activeReadingService.getExpectedAnswers(code),
}));

const { createApp } = await import('../src/app');

const createReadingApp = (overrides: Partial<ReadingService> = {}) => {
  activeReadingService = createReadingServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
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
      return { ...settings, defaultLevel: input.defaultLevel ?? settings.defaultLevel };
    },
  });

  const getResponse = await app.request('http://localhost/api/v1/reading/settings', { headers });
  const patchResponse = await app.request('http://localhost/api/v1/reading/settings', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ defaultLevel: 'B1' }),
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: settings });
  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ defaultLevel: 'B1' });
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
      targetWordCount: material.targetWordCount,
      passageText: material.passageText,
      source: material.source,
      questions: expectedAnswers.map(({ questionText, expectedAnswer }) => ({ questionText, expectedAnswer })),
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput?.questions).toEqual(
    expectedAnswers.map(({ questionText, expectedAnswer }) => ({ questionText, expectedAnswer })),
  );
  expect(await response.json()).toEqual({ success: true, data: material });
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
      targetWordCount: material.targetWordCount,
      passageText: material.passageText,
      source: material.source,
      questions: expectedAnswers.slice(0, 2),
    }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('passes a complete reading submission to the service', async () => {
  let submissionInput: SaveReadingSubmissionRequest | undefined;
  const answers = expectedAnswers.map(({ questionNumber }) => ({ questionNumber, userAnswer: 'Answer' }));
  const response = await createReadingApp({
    saveSubmission: async (_code, input) => {
      submissionInput = input;
      return material;
    },
  }).request(`http://localhost/api/v1/reading/materials/${material.code}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers }),
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
  expect(await response.json()).toEqual({ success: true, data: { items: expectedAnswers } });
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
