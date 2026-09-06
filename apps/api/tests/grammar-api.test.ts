import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import type {
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarReport,
  GrammarService,
  GrammarSession,
  GrammarSettings,
  SaveGrammarAnswerRequest,
  UpdateGrammarSettingsRequest,
} from '../src/modules/grammar/grammar.types';

const settings: GrammarSettings = {
  defaultLevel: 'A1',
  dailyQuestionCount: 5,
  updatedAt: '2026-09-05T10:00:00.000Z',
};

const session: GrammarSession = {
  code: 'GR-20260905-001',
  mode: 'practice',
  source: 'request',
  status: 'active',
  level: 'A1',
  questionCount: 1,
  score: null,
  maxScore: null,
  startedAt: '2026-09-05T10:00:00.000Z',
  completedAt: null,
  questions: [
    {
      questionNumber: 1,
      questionType: 'fill_blank',
      grammarArea: 'tenses',
      grammarPoint: 'simple past',
      level: 'A1',
      questionText: 'She ___ (go) to school yesterday.',
      answer: null,
    },
  ],
};

const explanation: GrammarExplanation = {
  questionNumber: 1,
  questionText: 'She ___ (go) to school yesterday.',
  grammarArea: 'tenses',
  grammarPoint: 'simple past',
  explanation: 'Use the simple past form “went” for a completed action yesterday.',
};

const report: GrammarReport = {
  code: 'GR-20260905-002',
  status: 'completed',
  score: 1,
  maxScore: 1,
  breakdown: [{ grammarArea: 'tenses', correct: 1, partial: 0, incorrect: 0 }],
};

const createGrammarServiceStub = (overrides: Partial<GrammarService> = {}): GrammarService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createSession: async () => session,
  getSession: async () => session,
  removeSession: async () => {},
  saveAnswer: async () => session,
  getExplanation: async () => explanation,
  evaluateSession: async () => report,
  getReport: async () => report,
  ...overrides,
});

let activeGrammarService = createGrammarServiceStub();

mock.module('../src/modules/grammar/grammar.service', () => ({
  getSettings: () => activeGrammarService.getSettings(),
  updateSettings: (input: UpdateGrammarSettingsRequest) => activeGrammarService.updateSettings(input),
  createSession: (input: CreateGrammarSessionRequest) => activeGrammarService.createSession(input),
  getSession: (code: string) => activeGrammarService.getSession(code),
  removeSession: (code: string) => activeGrammarService.removeSession(code),
  saveAnswer: (code: string, questionNumber: number, input: SaveGrammarAnswerRequest) =>
    activeGrammarService.saveAnswer(code, questionNumber, input),
  getExplanation: (code: string, questionNumber: number) => activeGrammarService.getExplanation(code, questionNumber),
  evaluateSession: (code: string, input: EvaluateGrammarSessionRequest) =>
    activeGrammarService.evaluateSession(code, input),
  getReport: (code: string) => activeGrammarService.getReport(code),
}));

const { createApp } = await import('../src/app');

const createGrammarApp = (overrides: Partial<GrammarService> = {}) => {
  activeGrammarService = createGrammarServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
};

test('reads and updates grammar settings', async () => {
  let updateInput: UpdateGrammarSettingsRequest | undefined;
  const app = createGrammarApp({
    updateSettings: async (input) => {
      updateInput = input;
      return { ...settings, ...input };
    },
  });
  const getResponse = await app.request('http://localhost/api/v1/grammar/settings', {
    headers: { Authorization: 'Bearer test-api-key' },
  });
  const patchResponse = await app.request('http://localhost/api/v1/grammar/settings', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ defaultLevel: 'B1', dailyQuestionCount: 10 }),
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(settings) });
  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ defaultLevel: 'B1', dailyQuestionCount: 10 });
});

test('creates a grammar session without exposing correct answers or explanations', async () => {
  const response = await createGrammarApp().request('http://localhost/api/v1/grammar/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'practice',
      source: 'request',
      level: 'A1',
      questions: [
        {
          questionType: 'fill_blank',
          grammarArea: 'tenses',
          grammarPoint: 'simple past',
          level: 'A1',
          questionText: 'She ___ (go) to school yesterday.',
          correctAnswer: 'went',
          explanation: 'Use the simple past form “went”.',
        },
      ],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(session) });
});

test('reads and soft deletes a grammar session by code', async () => {
  let removedCode: string | undefined;
  const app = createGrammarApp({
    removeSession: async (code) => {
      removedCode = code;
    },
  });
  const url = `http://localhost/api/v1/grammar/sessions/${session.code}`;
  const getResponse = await app.request(url, { headers: { Authorization: 'Bearer test-api-key' } });
  const deleteResponse = await app.request(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(session) });
  expect(deleteResponse.status).toBe(204);
  expect(removedCode).toBe(session.code);
});

test('rejects an incomplete grammar session payload without calling the service', async () => {
  let createCalled = false;
  const app = createGrammarApp({
    createSession: async () => {
      createCalled = true;
      return session;
    },
  });

  const response = await app.request('http://localhost/api/v1/grammar/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'practice', source: 'request', level: 'A1', questions: [] }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
});

test('passes an immediate practice evaluation to the grammar service', async () => {
  let answerInput: SaveGrammarAnswerRequest | undefined;
  const response = await createGrammarApp({
    saveAnswer: async (_code, _questionNumber, input) => {
      answerInput = input;
      return session;
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-001/questions/1/answer', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAnswer: 'went', result: 'correct' }),
  });

  expect(response.status).toBe(200);
  expect(answerInput).toEqual({ userAnswer: 'went', result: 'correct' });
});

test('allows an exam answer to remain unevaluated at the API boundary', async () => {
  let answerInput: SaveGrammarAnswerRequest | undefined;
  const response = await createGrammarApp({
    saveAnswer: async (_code, _questionNumber, input) => {
      answerInput = input;
      return { ...session, mode: 'exam' };
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-002/questions/1/answer', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAnswer: 'went' }),
  });

  expect(response.status).toBe(200);
  expect(answerInput).toEqual({ userAnswer: 'went' });
});

test('passes a complete exam evaluation to the grammar service', async () => {
  let evaluationInput: EvaluateGrammarSessionRequest | undefined;
  const response = await createGrammarApp({
    evaluateSession: async (_code, input) => {
      evaluationInput = input;
      return report;
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-002/evaluate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers: [{ questionNumber: 1, result: 'correct' }] }),
  });

  expect(response.status).toBe(200);
  expect(evaluationInput).toEqual({ answers: [{ questionNumber: 1, result: 'correct', feedback: null }] });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(report) });
});

test('returns an explanation through its dedicated endpoint', async () => {
  const response = await createGrammarApp().request(
    'http://localhost/api/v1/grammar/sessions/GR-20260905-001/questions/1/explanation',
    { headers: { Authorization: 'Bearer test-api-key' } },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(explanation) });
});

test('returns the stored grammar report', async () => {
  let reportCode: string | undefined;
  const response = await createGrammarApp({
    getReport: async (code) => {
      reportCode = code;
      return report;
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-002/report', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(reportCode).toBe('GR-20260905-002');
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(report) });
});
