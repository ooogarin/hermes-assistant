import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { testWebAuth, testWebPassword } from './fixtures/auth';
import { writingAnalysis } from './fixtures/writing';
import type {
  CreateWritingMaterialRequest,
  WritingMaterial,
  WritingMaterialList,
  WritingMaterialReferenceRequest,
  WritingMaterialService,
} from '../src/modules/writing/writing-material/writing-material.types';
import type {
  UpdateWritingSettingsRequest,
  WritingSettingService,
  WritingSettings,
} from '../src/modules/writing/writing-setting/writing-setting.types';
import type {
  CreateWritingSubmissionRequest,
  ListWritingSubmissionsRequest,
  SaveWritingAnalysisRequest,
  UpdateWritingSubmissionRequest,
  WritingCorrectedText,
  WritingSubmission,
  WritingSubmissionReferenceRequest,
  WritingSubmissionService,
} from '../src/modules/writing/writing-submission/writing-submission.types';

type WritingApiService = WritingMaterialService & WritingSubmissionService & WritingSettingService;

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
  source: 'request',
};

const submission: WritingSubmission = {
  code: 'WS-20260905-001',
  material_code: null,
  original_text: 'I go to the office yesterday.',
  word_count: 7,
  estimated_topic: null,
  estimated_genre: null,
  estimated_tags: null,
  estimated_level: null,
  analysis_status: 'not_analyzed',
  analysis: null,
  analyzed_at: null,
  created_at: '2026-09-05T10:10:00.000Z',
  updated_at: '2026-09-05T10:10:00.000Z',
};

const corrected_text: WritingCorrectedText = {
  code: submission.code,
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
      analyzed_submission_count: 0,
      unanalyzed_submission_count: 0,
      latest_submission_code: null,
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

const createWritingServiceStub = (overrides: Partial<WritingApiService> = {}): WritingApiService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createMaterial: async () => material,
  listMaterials: async () => materialList,
  getMaterial: async () => material,
  getMaterialReference: async () => ({ id: 1, code: material.code }),
  createSubmission: async () => submission,
  getSubmission: async () => submission,
  listSubmissions: async () => ({ items: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } }),
  updateSubmission: async () => submission,
  saveAnalysis: async () => submission,
  getCorrectedText: async () => corrected_text,
  ...overrides,
});

let activeWritingService = createWritingServiceStub();

mock.module('../src/modules/writing/writing-setting/writing-setting.service', () => ({
  getSettings: () => activeWritingService.getSettings(),
  updateSettings: (input: UpdateWritingSettingsRequest) => activeWritingService.updateSettings(input),
}));

mock.module('../src/modules/writing/writing-material/writing-material.service', () => ({
  createMaterial: (input: CreateWritingMaterialRequest) => activeWritingService.createMaterial(input),
  listMaterials: (input: Parameters<WritingApiService['listMaterials']>[0]) =>
    activeWritingService.listMaterials(input),
  getMaterial: (reference: WritingMaterialReferenceRequest) => activeWritingService.getMaterial(reference),
}));

mock.module('../src/modules/writing/writing-submission/writing-submission.service', () => ({
  createSubmission: (input: CreateWritingSubmissionRequest) => activeWritingService.createSubmission(input),
  getSubmission: (reference: WritingSubmissionReferenceRequest) => activeWritingService.getSubmission(reference),
  listSubmissions: (input: ListWritingSubmissionsRequest) => activeWritingService.listSubmissions(input),
  updateSubmission: (reference: WritingSubmissionReferenceRequest, input: UpdateWritingSubmissionRequest) =>
    activeWritingService.updateSubmission(reference, input),
  saveAnalysis: (reference: WritingSubmissionReferenceRequest, input: SaveWritingAnalysisRequest) =>
    activeWritingService.saveAnalysis(reference, input),
  getCorrectedText: (reference: WritingSubmissionReferenceRequest) => activeWritingService.getCorrectedText(reference),
}));

const { createApp } = await import('../src/app');

const createWritingApp = (overrides: Partial<WritingApiService> = {}) => {
  activeWritingService = createWritingServiceStub(overrides);

  return createApp({ webAuth: testWebAuth, internalApiKey: 'test-api-key', isDatabaseReady: async () => true });
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
  let listInput: Parameters<WritingApiService['listMaterials']>[0] | undefined;
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
  let listInput: Parameters<WritingApiService['listMaterials']>[0] | undefined;
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

test('rejects analysis fields on the initial save before calling the service', async () => {
  let createCalled = false;
  const response = await createWritingApp({
    createSubmission: async () => {
      createCalled = true;
      return submission;
    },
  }).request('http://localhost/api/v1/writing/submissions', {
    method: 'POST',
    headers,
    body: JSON.stringify({ original_text: submission.original_text, analysis: writingAnalysis }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('creates a writing submission without analysis and preserves original text', async () => {
  let createInput: CreateWritingSubmissionRequest | undefined;
  const original_text = `  ${submission.original_text}\n`;
  const response = await createWritingApp({
    createSubmission: async (input) => {
      createInput = input;
      return submission;
    },
  }).request('http://localhost/api/v1/writing/submissions', {
    method: 'POST',
    headers,
    body: JSON.stringify({ original_text }),
  });

  expect(response.status).toBe(201);
  expect(createInput).toEqual({ original_text });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(submission) });
});

test('reads a submission using its public code', async () => {
  let reference: string | undefined;
  const response = await createWritingApp({
    getSubmission: async (submissionReference) => {
      reference = submissionReference.code;
      return submission;
    },
  }).request(`http://localhost/api/v1/writing/submissions/${submission.code}`, { headers });

  expect(response.status).toBe(200);
  expect(reference).toBe(submission.code);
});

test('returns corrected text through the dedicated endpoint', async () => {
  const response = await createWritingApp().request(
    `http://localhost/api/v1/writing/submissions/${submission.code}/corrected-text`,
    { headers },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(corrected_text) });
});

test('lists submissions with independent filters and pagination', async () => {
  let listInput: ListWritingSubmissionsRequest | undefined;
  const app = createWritingApp({
    listSubmissions: async (input) => {
      listInput = input;
      return { items: [], meta: { page: input.page, limit: input.limit, total: 0, total_pages: 0 } };
    },
  });

  const response = await app.request(
    'http://localhost/api/v1/writing/submissions?writing_type=free&analysis_status=not_analyzed&q=sport&page=2&limit=10&sort=oldest',
    { headers },
  );

  expect(response.status).toBe(200);
  expect(listInput).toEqual({
    writing_type: 'free',
    analysis_status: 'not_analyzed',
    q: 'sport',
    page: 2,
    limit: 10,
    sort: 'oldest',
  });

  const invalid = await app.request(
    `http://localhost/api/v1/writing/submissions?writing_type=free&material_code=${material.code}`,
    { headers },
  );

  expect(invalid.status).toBe(400);
});

test('validates editable fields and rejects server-owned or empty patches', async () => {
  let updateInput: UpdateWritingSubmissionRequest | undefined;
  const app = createWritingApp({
    updateSubmission: async (_code, input) => {
      updateInput = input;
      return submission;
    },
  });
  const url = `http://localhost/api/v1/writing/submissions/${submission.code}`;
  const valid = await app.request(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ estimated_topic: ' Sports ', estimated_tags: [], estimated_level: 'B1' }),
  });

  expect(valid.status).toBe(200);
  expect(updateInput).toEqual({ estimated_topic: 'Sports', estimated_tags: [], estimated_level: 'B1' });

  for (const body of [
    {},
    { original_text: ' \n' },
    { estimated_topic: null },
    { estimated_level: 'B3' },
    { material_code: material.code },
    { analysis: null },
    { word_count: 10 },
    { code: submission.code },
  ]) {
    const response = await app.request(url, { method: 'PATCH', headers, body: JSON.stringify(body) });

    expect(response.status).toBe(400);
  }
});

const analysisInput: SaveWritingAnalysisRequest = {
  estimated_topic: 'Work',
  estimated_genre: 'journal',
  estimated_tags: ['work'],
  estimated_level: 'A1',
  analysis: { ...writingAnalysis, prompt_adherence: null },
};

test('stores complete analysis only through authenticated Agent writes', async () => {
  let savedInput: SaveWritingAnalysisRequest | undefined;
  const app = createWritingApp({
    saveAnalysis: async (_code, input) => {
      savedInput = input;
      return submission;
    },
  });
  const url = `http://localhost/api/v1/writing/submissions/${submission.code}/analysis`;
  const agentResponse = await app.request(url, { method: 'PATCH', headers, body: JSON.stringify(analysisInput) });

  expect(agentResponse.status).toBe(200);
  expect(savedInput).toEqual(analysisInput);

  const login = await app.request('http://localhost/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: testWebAuth.origin },
    body: JSON.stringify({ password: testWebPassword }),
  });
  const cookie = login.headers.get('Set-Cookie')?.split(';')[0];

  expect(login.status).toBe(200);

  if (cookie === undefined) {
    throw new Error('Expected an authenticated browser cookie.');
  }

  savedInput = undefined;

  const browserResponse = await app.request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: testWebAuth.origin, Cookie: cookie },
    body: JSON.stringify(analysisInput),
  });

  expect(browserResponse.status).toBe(403);
  expect(savedInput).toBeUndefined();
  expect(await browserResponse.json()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
});

test('rejects incomplete analysis, inconsistent grammar counts, and obsolete adherence fields', async () => {
  let saved = false;
  const app = createWritingApp({
    saveAnalysis: async () => {
      saved = true;
      return submission;
    },
  });
  const invalidBodies = [
    { ...analysisInput, analysis: { corrected_text: 'Corrected.' } },
    {
      ...analysisInput,
      analysis: { ...analysisInput.analysis, grammar: { ...writingAnalysis.grammar, error_count: 0 } },
    },
    {
      ...analysisInput,
      analysis: { ...analysisInput.analysis, topic_adherence: { status: 'aligned', notes: 'Old format.' } },
    },
    { analysis: writingAnalysis },
  ];

  for (const body of invalidBodies) {
    const response = await app.request(`http://localhost/api/v1/writing/submissions/${submission.code}/analysis`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);
  }

  expect(saved).toBe(false);
});

test('rejects obsolete number-based submission routes and invalid submission codes', async () => {
  const app = createWritingApp();
  const obsolete = await app.request(`http://localhost/api/v1/writing/materials/${material.code}/submissions/1`, {
    headers,
  });
  const invalid = await app.request(`http://localhost/api/v1/writing/submissions/${material.code}`, { headers });

  expect(obsolete.status).toBe(404);
  expect(invalid.status).toBe(400);
});

test('normalizes mixed-case estimated genre to the stored lowercase form', async () => {
  let updateInput: UpdateWritingSubmissionRequest | undefined;
  const app = createWritingApp({
    updateSubmission: async (_code, input) => {
      updateInput = input;
      return { ...submission, estimated_genre: 'Journal' };
    },
  });

  const response = await app.request(`http://localhost/api/v1/writing/submissions/${submission.code}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ estimated_genre: 'Journal' }),
  });

  expect(response.status).toBe(200);
  expect(updateInput).toEqual({ estimated_genre: 'journal' });
});
