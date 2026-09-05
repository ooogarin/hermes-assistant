import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { writingAnalysis } from './fixtures/writing';
import type {
  CreateWritingMaterialRequest,
  CreateWritingSubmissionRequest,
  UpdateWritingSettingsRequest,
  WritingCorrectedText,
  WritingMaterial,
  WritingService,
  WritingSettings,
  WritingSubmission,
} from '../src/modules/writing/writing.types';

const settings: WritingSettings = {
  defaultLevel: 'A1',
  defaultWordCount: 150,
  minWordCount: 120,
  maxWordCount: 180,
  updatedAt: '2026-09-05T10:00:00.000Z',
};

const material: WritingMaterial = {
  code: 'WR-20260905-001',
  topic: 'My work week',
  promptText: 'Describe your work experience this week.',
  level: 'A1',
  genre: 'journal',
  tags: ['work', 'reflection'],
  targetWordCount: 150,
  isOverride: false,
  source: 'request',
};

const submission: WritingSubmission = {
  submissionNumber: 1,
  originalText: 'I go to the office yesterday.',
  wordCount: 7,
  estimatedLevel: 'A1',
  analysis: writingAnalysis,
  submittedAt: '2026-09-05T10:10:00.000Z',
};

const correctedText: WritingCorrectedText = {
  submissionNumber: 1,
  correctedText: writingAnalysis.correctedText,
};

const createWritingServiceStub = (overrides: Partial<WritingService> = {}): WritingService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
  getMaterial: async () => material,
  createSubmission: async () => submission,
  getSubmission: async () => submission,
  getCorrectedText: async () => correctedText,
  ...overrides,
});

let activeWritingService = createWritingServiceStub();

mock.module('../src/modules/writing/writing.service', () => ({
  getSettings: () => activeWritingService.getSettings(),
  updateSettings: (input: UpdateWritingSettingsRequest) => activeWritingService.updateSettings(input),
  createMaterial: (input: CreateWritingMaterialRequest) => activeWritingService.createMaterial(input),
  getMaterial: (code: string) => activeWritingService.getMaterial(code),
  createSubmission: (code: string, input: CreateWritingSubmissionRequest) =>
    activeWritingService.createSubmission(code, input),
  getSubmission: (code: string, submissionNumber: number) => activeWritingService.getSubmission(code, submissionNumber),
  getCorrectedText: (code: string, submissionNumber: number) =>
    activeWritingService.getCorrectedText(code, submissionNumber),
}));

const { createApp } = await import('../src/app');

const createWritingApp = (overrides: Partial<WritingService> = {}) => {
  activeWritingService = createWritingServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
};

const headers = {
  Authorization: 'Bearer test-api-key',
  'Content-Type': 'application/json',
};

test('reads and updates writing settings', async () => {
  let updateInput: UpdateWritingSettingsRequest | undefined;
  const app = createWritingApp({
    updateSettings: async (input) => {
      updateInput = input;
      return { ...settings, defaultLevel: input.defaultLevel ?? settings.defaultLevel };
    },
  });

  const getResponse = await app.request('http://localhost/api/v1/writing/settings', { headers });
  const patchResponse = await app.request('http://localhost/api/v1/writing/settings', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ default_level: 'B1' }),
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(settings) });
  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ defaultLevel: 'B1' });
});

test('creates and reads a writing material', async () => {
  let createInput: CreateWritingMaterialRequest | undefined;
  const app = createWritingApp({
    createMaterial: async (input) => {
      createInput = input;
      return material;
    },
  });
  const createResponse = await app.request('http://localhost/api/v1/writing/materials', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic: material.topic,
      prompt_text: material.promptText,
      level: material.level,
      genre: material.genre,
      tags: material.tags,
      target_word_count: material.targetWordCount,
      source: material.source,
    }),
  });
  const getResponse = await app.request(`http://localhost/api/v1/writing/materials/${material.code}`, { headers });

  expect(createResponse.status).toBe(201);
  expect(createInput).toEqual({
    topic: material.topic,
    promptText: material.promptText,
    level: material.level,
    genre: material.genre,
    tags: material.tags,
    targetWordCount: material.targetWordCount,
    source: material.source,
  });
  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(material) });
});

test('validates structured writing analysis before calling the service', async () => {
  let createCalled = false;
  const response = await createWritingApp({
    createSubmission: async () => {
      createCalled = true;
      return submission;
    },
  }).request(`http://localhost/api/v1/writing/materials/${material.code}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      original_text: submission.originalText,
      estimated_level: submission.estimatedLevel,
      analysis: { corrected_text: writingAnalysis.correctedText },
    }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('creates a writing submission with validated analysis', async () => {
  let createInput: CreateWritingSubmissionRequest | undefined;
  const response = await createWritingApp({
    createSubmission: async (_code, input) => {
      createInput = input;
      return submission;
    },
  }).request(`http://localhost/api/v1/writing/materials/${material.code}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      original_text: submission.originalText,
      estimated_level: submission.estimatedLevel,
      analysis: toSnakeCaseJson(writingAnalysis),
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput).toEqual({
    originalText: submission.originalText,
    estimatedLevel: submission.estimatedLevel,
    analysis: writingAnalysis,
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(submission) });
});

test('reads a submission using a numeric submission reference', async () => {
  let reference: { code: string; submissionNumber: number } | undefined;
  const response = await createWritingApp({
    getSubmission: async (code, submissionNumber) => {
      reference = { code, submissionNumber };
      return submission;
    },
  }).request(`http://localhost/api/v1/writing/materials/${material.code}/submissions/1`, { headers });

  expect(response.status).toBe(200);
  expect(reference).toEqual({ code: material.code, submissionNumber: 1 });
});

test('returns corrected text through the dedicated endpoint', async () => {
  const response = await createWritingApp().request(
    `http://localhost/api/v1/writing/materials/${material.code}/submissions/1/corrected-text`,
    { headers },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(correctedText) });
});
