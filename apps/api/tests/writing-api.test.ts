import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { writingAnalysis } from './fixtures/writing';
import type {
  CreateWritingMaterialRequest,
  CreateWritingSubmissionRequest,
  UpdateWritingSettingsRequest,
  WritingCorrectedText,
  WritingMaterial,
  WritingMaterialList,
  WritingService,
  WritingSettings,
  WritingSubmission,
} from '../src/modules/writing/writing.types';

const settings: WritingSettings = {
  default_level: 'A1',
  default_word_count: 150,
  min_word_count: 120,
  max_word_count: 180,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const material: WritingMaterial = {
  code: 'WR-20260905-001',
  topic: 'My work week',
  prompt_text: 'Describe your work experience this week.',
  level: 'A1',
  genre: 'journal',
  tags: ['work', 'reflection'],
  target_word_count: 150,
  is_override: false,
  source: 'request',
};

const submission: WritingSubmission = {
  submission_number: 1,
  original_text: 'I go to the office yesterday.',
  word_count: 7,
  estimated_level: 'A1',
  analysis: writingAnalysis,
  submitted_at: '2026-09-05T10:10:00.000Z',
};

const corrected_text: WritingCorrectedText = {
  submission_number: 1,
  corrected_text: writingAnalysis.corrected_text,
};

const materialList: WritingMaterialList = {
  items: [
    {
      code: material.code,
      topic: material.topic,
      prompt_excerpt: material.prompt_text,
      genre: material.genre,
      level: material.level,
      target_word_count: material.target_word_count,
      tags: material.tags,
      source: material.source,
      status: 'unsubmitted',
      submission_count: 0,
      latest_submission_number: null,
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

const createWritingServiceStub = (overrides: Partial<WritingService> = {}): WritingService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
  listMaterials: async () => materialList,
  getMaterial: async () => material,
  createSubmission: async () => submission,
  getSubmission: async () => submission,
  getCorrectedText: async () => corrected_text,
  ...overrides,
});

let activeWritingService = createWritingServiceStub();

mock.module('../src/modules/writing/writing.service', () => ({
  getSettings: () => activeWritingService.getSettings(),
  updateSettings: (input: UpdateWritingSettingsRequest) => activeWritingService.updateSettings(input),
  createMaterial: (input: CreateWritingMaterialRequest) => activeWritingService.createMaterial(input),
  listMaterials: (input: Parameters<WritingService['listMaterials']>[0]) => activeWritingService.listMaterials(input),
  getMaterial: (code: string) => activeWritingService.getMaterial(code),
  createSubmission: (code: string, input: CreateWritingSubmissionRequest) =>
    activeWritingService.createSubmission(code, input),
  getSubmission: (code: string, submission_number: number) =>
    activeWritingService.getSubmission(code, submission_number),
  getCorrectedText: (code: string, submission_number: number) =>
    activeWritingService.getCorrectedText(code, submission_number),
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
      return { ...settings, default_level: input.default_level ?? settings.default_level };
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
  expect(updateInput).toEqual({ default_level: 'B1' });
});

test('lists writing materials with validated filters and pagination', async () => {
  let listInput: Parameters<WritingService['listMaterials']>[0] | undefined;
  const response = await createWritingApp({
    listMaterials: async (input) => {
      listInput = input;
      return materialList;
    },
  }).request(
    'http://localhost/api/v1/writing/materials?q=work&status=unsubmitted&levels=A2%2CB2&page=1&limit=20&sort=newest',
    { headers },
  );

  expect(response.status).toBe(200);
  expect(listInput).toEqual({
    q: 'work',
    status: 'unsubmitted',
    levels: ['A2', 'B2'],
    page: 1,
    limit: 20,
    sort: 'newest',
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(materialList) });
});

test('normalizes the legacy writing level filter and rejects ambiguous level filters', async () => {
  let listInput: Parameters<WritingService['listMaterials']>[0] | undefined;
  const app = createWritingApp({
    listMaterials: async (input) => {
      listInput = input;
      return materialList;
    },
  });

  const legacyResponse = await app.request('http://localhost/api/v1/writing/materials?level=B1', { headers });
  const ambiguousResponse = await app.request('http://localhost/api/v1/writing/materials?level=A1&levels=B1', {
    headers,
  });

  expect(legacyResponse.status).toBe(200);
  expect(listInput).toMatchObject({ levels: ['B1'] });
  expect(ambiguousResponse.status).toBe(400);
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
      prompt_text: material.prompt_text,
      level: material.level,
      genre: material.genre,
      tags: material.tags,
      target_word_count: material.target_word_count,
      source: material.source,
    }),
  });
  const getResponse = await app.request(`http://localhost/api/v1/writing/materials/${material.code}`, { headers });

  expect(createResponse.status).toBe(201);
  expect(createInput).toEqual({
    topic: material.topic,
    prompt_text: material.prompt_text,
    level: material.level,
    genre: material.genre,
    tags: material.tags,
    target_word_count: material.target_word_count,
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
      original_text: submission.original_text,
      estimated_level: submission.estimated_level,
      analysis: { corrected_text: writingAnalysis.corrected_text },
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
      original_text: submission.original_text,
      estimated_level: submission.estimated_level,
      analysis: writingAnalysis,
    }),
  });

  expect(response.status).toBe(201);
  expect(createInput).toEqual({
    original_text: submission.original_text,
    estimated_level: submission.estimated_level,
    analysis: writingAnalysis,
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(submission) });
});

test('reads a submission using a numeric submission reference', async () => {
  let reference: { code: string; submission_number: number } | undefined;
  const response = await createWritingApp({
    getSubmission: async (code, submission_number) => {
      reference = { code, submission_number };
      return submission;
    },
  }).request(`http://localhost/api/v1/writing/materials/${material.code}/submissions/1`, { headers });

  expect(response.status).toBe(200);
  expect(reference).toEqual({ code: material.code, submission_number: 1 });
});

test('returns corrected text through the dedicated endpoint', async () => {
  const response = await createWritingApp().request(
    `http://localhost/api/v1/writing/materials/${material.code}/submissions/1/corrected-text`,
    { headers },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(corrected_text) });
});
