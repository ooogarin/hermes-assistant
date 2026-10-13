import { expect, mock, test } from 'bun:test';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import { testWebAuth } from './fixtures/auth';
import type {
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarReport,
  GrammarService,
  GrammarSession,
  GrammarSessionList,
  SaveAnswersRequest,
} from '../src/modules/grammar/grammar.types';
import type {
  GrammarSettingService,
  GrammarSettings,
  UpdateGrammarSettingsRequest,
} from '../src/modules/grammar/grammar-setting/grammar-setting.types';

type GrammarApiService = GrammarService & GrammarSettingService;

const settings: GrammarSettings = {
  default_level: 'A1',
  daily_question_count: 5,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const session: GrammarSession = {
  code: 'GR-20260905-001',
  mode: 'practice',
  source: 'request',
  status: 'active',
  level: 'A1',
  question_count: 1,
  score: null,
  max_score: null,
  started_at: '2026-09-05T10:00:00.000Z',
  completed_at: null,
  questions: [
    {
      question_number: 1,
      question_type: 'fill_blank',
      grammar_area: 'tenses',
      grammar_point: 'simple past',
      level: 'A1',
      question_text: 'She ___ (go) to school yesterday.',
      answer: null,
    },
  ],
};

const explanation: GrammarExplanation = {
  question_number: 1,
  question_text: 'She ___ (go) to school yesterday.',
  grammar_area: 'tenses',
  grammar_point: 'simple past',
  explanation: 'Use the simple past form “went” for a completed action yesterday.',
};

const report: GrammarReport = {
  code: 'GR-20260905-002',
  status: 'completed',
  score: 1,
  max_score: 1,
  breakdown: [{ grammar_area: 'tenses', correct: 1, partial: 0, incorrect: 0 }],
};

const sessionList: GrammarSessionList = {
  items: [
    {
      code: session.code,
      mode: session.mode,
      source: session.source,
      status: session.status,
      level: session.level,
      question_count: session.question_count,
      score: session.score,
      max_score: session.max_score,
      started_at: session.started_at,
      completed_at: session.completed_at,
    },
  ],
};

const createGrammarServiceStub = (overrides: Partial<GrammarApiService> = {}): GrammarApiService => ({
  getSettings: async () => settings,
  updateSettings: async () => settings,
  createSession: async () => session,
  listSessions: async () => sessionList,
  getSession: async () => session,
  removeSession: async () => {},
  saveAnswers: async () => session,
  getExplanation: async () => explanation,
  evaluateSession: async () => report,
  getReport: async () => report,
  ...overrides,
});

let activeGrammarService = createGrammarServiceStub();

mock.module('../src/modules/grammar/grammar-setting/grammar-setting.service', () => ({
  getSettings: () => activeGrammarService.getSettings(),
  updateSettings: (input: UpdateGrammarSettingsRequest) => activeGrammarService.updateSettings(input),
}));

mock.module('../src/modules/grammar/grammar.service', () => ({
  createSession: (input: CreateGrammarSessionRequest) => activeGrammarService.createSession(input),
  listSessions: (input: Parameters<GrammarApiService['listSessions']>[0]) => activeGrammarService.listSessions(input),
  getSession: (code: string) => activeGrammarService.getSession(code),
  removeSession: (code: string) => activeGrammarService.removeSession(code),
  saveAnswers: (code: string, input: SaveAnswersRequest) => activeGrammarService.saveAnswers(code, input),
  getExplanation: (code: string, question_number: number) => activeGrammarService.getExplanation(code, question_number),
  evaluateSession: (code: string, input: EvaluateGrammarSessionRequest) =>
    activeGrammarService.evaluateSession(code, input),
  getReport: (code: string) => activeGrammarService.getReport(code),
}));

const { createApp } = await import('../src/app');

const createGrammarApp = (overrides: Partial<GrammarApiService> = {}) => {
  activeGrammarService = createGrammarServiceStub(overrides);

  return createApp({ webAuth: testWebAuth, internalApiKey: 'test-api-key', isDatabaseReady: async () => true });
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
    body: JSON.stringify({ default_level: 'B1', daily_question_count: 10 }),
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual({ success: true, data: toSnakeCaseJson(settings) });
  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ default_level: 'B1', daily_question_count: 10 });
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
          question_type: 'fill_blank',
          grammar_area: 'tenses',
          grammar_point: 'simple past',
          level: 'A1',
          question_text: 'She ___ (go) to school yesterday.',
          correct_answer: 'went',
          explanation: 'Use the simple past form “went”.',
        },
      ],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(session) });
});

test('rejects unknown fields in grammar session bodies', async () => {
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
      unexpected: true,
      questions: [
        {
          question_type: 'fill_blank',
          grammar_area: 'tenses',
          grammar_point: 'simple past',
          level: 'A1',
          question_text: 'She ___ (go) to school yesterday.',
          correct_answer: 'went',
          explanation: 'Use the simple past form “went”.',
        },
      ],
    }),
  });

  expect(response.status).toBe(400);
});

test('lists grammar sessions with validated filters', async () => {
  let listInput: Parameters<GrammarApiService['listSessions']>[0] | undefined;
  const response = await createGrammarApp({
    listSessions: async (input) => {
      listInput = input;
      return sessionList;
    },
  }).request(
    'http://localhost/api/v1/grammar/sessions?q=past&status=completed&mode=exam&level=B1&limit=10&sort=oldest',
    { headers: { Authorization: 'Bearer test-api-key' } },
  );

  expect(response.status).toBe(200);
  expect(listInput).toEqual({
    q: 'past',
    status: 'completed',
    mode: 'exam',
    level: 'B1',
    limit: 10,
    sort: 'oldest',
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(sessionList) });
});

test('rejects invalid grammar session list filters without calling the service', async () => {
  let listCalled = false;
  const response = await createGrammarApp({
    listSessions: async () => {
      listCalled = true;
      return sessionList;
    },
  }).request('http://localhost/api/v1/grammar/sessions?limit=101', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(400);
  expect(listCalled).toBe(false);
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

test('passes practice answers with immediate evaluations to the grammar service', async () => {
  let answerInput: SaveAnswersRequest | undefined;
  const response = await createGrammarApp({
    saveAnswers: async (_code, input) => {
      answerInput = input;
      return session;
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-001/answers', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      answers: [
        { question_number: 1, user_answer: 'went', result: 'correct' },
        { question_number: 2, user_answer: 'go', result: 'incorrect', feedback: 'Use went.' },
      ],
    }),
  });

  expect(response.status).toBe(200);
  expect(answerInput).toEqual({
    answers: [
      { question_number: 1, user_answer: 'went', result: 'correct' },
      { question_number: 2, user_answer: 'go', result: 'incorrect', feedback: 'Use went.' },
    ],
  });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(session) });
});

test('allows exam answers to remain unevaluated at the API boundary', async () => {
  let answerInput: SaveAnswersRequest | undefined;
  const response = await createGrammarApp({
    saveAnswers: async (_code, input) => {
      answerInput = input;
      return { ...session, mode: 'exam' };
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-002/answers', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers: [{ question_number: 1, user_answer: 'went' }] }),
  });

  expect(response.status).toBe(200);
  expect(answerInput).toEqual({ answers: [{ question_number: 1, user_answer: 'went' }] });
});

test('rejects invalid bulk answer payloads without calling the service', async () => {
  let saveAnswersCalled = false;
  const app = createGrammarApp({
    saveAnswers: async () => {
      saveAnswersCalled = true;
      return session;
    },
  });
  const emptyResponse = await app.request('http://localhost/api/v1/grammar/sessions/GR-20260905-001/answers', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers: [] }),
  });
  const unevaluatedResponse = await app.request('http://localhost/api/v1/grammar/sessions/GR-20260905-001/answers', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      answers: [{ question_number: 1, user_answer: 'went', feedback: 'Use went.' }],
    }),
  });

  expect(emptyResponse.status).toBe(400);
  expect(unevaluatedResponse.status).toBe(400);
  expect(saveAnswersCalled).toBe(false);
});

test('no longer accepts per-question answer submissions', async () => {
  let saveAnswersCalled = false;
  const response = await createGrammarApp({
    saveAnswers: async () => {
      saveAnswersCalled = true;
      return session;
    },
  }).request('http://localhost/api/v1/grammar/sessions/GR-20260905-001/questions/1/answer', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_answer: 'went', result: 'correct' }),
  });

  expect(response.status).toBe(404);
  expect(saveAnswersCalled).toBe(false);
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
    body: JSON.stringify({ answers: [{ question_number: 1, result: 'correct' }] }),
  });

  expect(response.status).toBe(200);
  expect(evaluationInput).toEqual({ answers: [{ question_number: 1, result: 'correct', feedback: null }] });
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
