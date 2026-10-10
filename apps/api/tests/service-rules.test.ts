import { beforeEach, expect, mock, test } from 'bun:test';
import { writingAnalysis } from './fixtures/writing';
import type { DatabaseReservedConnection } from '../src/core/database/database.types';
import type { FinanceDailySummaryQuery, FinanceDailySummaryRow } from '../src/modules/finance/finance.types';
import type {
  GrammarCountRow,
  GrammarQuestion,
  GrammarQuestionRow,
  GrammarSession,
  GrammarSessionListRow,
  GrammarSessionRow,
  SaveAnswersPayload,
} from '../src/modules/grammar/grammar.types';
import type { JunkItemRow } from '../src/modules/junk/junk.types';
import type {
  ReadingMaterial,
  ReadingMaterialListRow,
  ReadingMaterialRow,
  ReadingQuestionWithAnswerRow,
  SaveReadingAnswersPayload,
} from '../src/modules/reading/reading.types';
import type { ReadingSettings, ReadingSettingsRow } from '../src/modules/reading/reading-setting/reading-setting.types';
import type {
  WritingCountRow,
  WritingMaterial,
  WritingMaterialListRow,
  WritingMaterialRow,
} from '../src/modules/writing/writing-material/writing-material.types';
import type { WritingSettings, WritingSettingsRow } from '../src/modules/writing/writing-setting/writing-setting.types';
import type {
  CreateWritingSubmissionPayload,
  SaveWritingAnalysisPayload,
  UpdateWritingSubmissionPayload,
  WritingSubmission,
  WritingSubmissionRow,
} from '../src/modules/writing/writing-submission/writing-submission.types';

const grammarQuestion: GrammarQuestion = {
  question_number: 1,
  question_type: 'fill_blank',
  grammar_area: 'tenses',
  grammar_point: 'simple past',
  level: 'A1',
  question_text: 'She ___ (go) yesterday.',
  answer: null,
};

const grammarSession: GrammarSession = {
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
  questions: [grammarQuestion],
};

const writingMaterial: WritingMaterial = {
  code: 'WR-20260905-001',
  topic: 'A calm place',
  prompt_text: 'Describe a place that makes you feel calm.',
  level: 'A1',
  genre: 'journal',
  tags: [],
  target_word_count: 150,
  source: 'request',
};

const readingSettings: ReadingSettings = {
  default_level: 'A1',
  default_word_count: 300,
  default_question_count: 3,
  min_word_count: 250,
  max_word_count: 350,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const readingMaterial: ReadingMaterial = {
  code: 'RD-20260905-001',
  title: 'Morning market',
  level: 'A1',
  genre: 'story',
  tags: [],
  target_word_count: 300,
  target_question_count: 3,
  reading_status: 'unread',
  created_at: '2026-09-05T10:00:00.000Z',
  updated_at: '2026-09-05T10:00:00.000Z',
  word_count: 5,
  content_text: 'Mira visits the morning market.',
  is_override: false,
  source: 'request',
  questions: [
    { question_number: 1, question_text: 'Who visits?', user_answer: null },
    { question_number: 2, question_text: 'Where?', user_answer: null },
    { question_number: 3, question_text: 'When?', user_answer: null },
  ],
};

const readingSettingsRow: ReadingSettingsRow = {
  default_level: readingSettings.default_level,
  default_word_count: readingSettings.default_word_count,
  default_question_count: readingSettings.default_question_count,
  min_word_count: readingSettings.min_word_count,
  max_word_count: readingSettings.max_word_count,
  updated_at: readingSettings.updated_at,
};

const readingMaterialRow: ReadingMaterialRow = {
  id: 1,
  code: readingMaterial.code,
  title: readingMaterial.title,
  level: readingMaterial.level,
  genre: readingMaterial.genre,
  tags: readingMaterial.tags,
  target_word_count: readingMaterial.target_word_count,
  target_question_count: readingMaterial.target_question_count,
  reading_status: readingMaterial.reading_status,
  created_at: readingMaterial.created_at,
  updated_at: readingMaterial.updated_at,
  word_count: readingMaterial.word_count,
  content_text: readingMaterial.content_text,
  is_override: readingMaterial.is_override,
  source: readingMaterial.source,
};

const readingQuestionRows: ReadingQuestionWithAnswerRow[] = readingMaterial.questions.map((question) => ({
  question_number: question.question_number,
  question_text: question.question_text,
  user_answer: question.user_answer,
}));

const writingSettings: WritingSettings = {
  default_level: 'A1',
  default_word_count: 150,
  min_word_count: 120,
  max_word_count: 180,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const writingSubmission: WritingSubmission = {
  code: 'WS-20260905-001',
  material_code: writingMaterial.code,
  original_text: 'I go yesterday.',
  word_count: 3,
  estimated_topic: 'Work',
  estimated_genre: 'Journal',
  estimated_tags: ['Work'],
  estimated_level: 'A1',
  analysis_status: 'analyzed',
  analysis: writingAnalysis,
  analyzed_at: '2026-09-05T10:00:00.000Z',
  created_at: '2026-09-05T10:00:00.000Z',
  updated_at: '2026-09-05T10:00:00.000Z',
};

const writingSettingsRow: WritingSettingsRow = {
  default_level: writingSettings.default_level,
  default_word_count: writingSettings.default_word_count,
  min_word_count: writingSettings.min_word_count,
  max_word_count: writingSettings.max_word_count,
  updated_at: writingSettings.updated_at,
};

const writingMaterialRow: WritingMaterialRow = {
  id: 1,
  code: writingMaterial.code,
  topic: writingMaterial.topic,
  prompt_text: writingMaterial.prompt_text,
  level: writingMaterial.level,
  genre: writingMaterial.genre,
  tags: writingMaterial.tags,
  target_word_count: writingMaterial.target_word_count,
  source: writingMaterial.source,
};

// The stored row keeps lowercase metadata; service responses format the labels.
const writingSubmissionRow: WritingSubmissionRow = {
  ...writingSubmission,
  estimated_genre: 'journal',
  estimated_tags: ['work'],
};

let financeCategories: Array<{ id: number; code: string; name: string; description: string; type: 'expense' }> = [];
let financeDailySummaryResult: FinanceDailySummaryRow[] = [];
let grammarLockedSessionResult: GrammarSession = grammarSession;
let grammarListResult: GrammarSessionListRow[] = [];
let grammarCountResult: GrammarCountRow = { total: 0 };
let grammarAnswerWriteCount = 0;
let grammarAnswersPayloadResult: SaveAnswersPayload | null = null;
let grammarCompletionWriteCount = 0;
let grammarCompletionResult: { code: string; score: number; max_score: number } | null = null;
let grammarReadConnections: Array<DatabaseReservedConnection | undefined> = [];
let committedTransactionCount = 0;
let rolledBackTransactionCount = 0;
let noteResult: { code: string } | null = null;
let junkResult: JunkItemRow | null = null;
let readingSettingsResult = readingSettingsRow;
let readingMaterialResult: ReadingMaterialRow | null = readingMaterialRow;
let readingQuestionsResult: ReadingQuestionWithAnswerRow[] = readingQuestionRows;
let readingListResult: ReadingMaterialListRow[] = [];
let readingSubmissionPayloadResult: SaveReadingAnswersPayload | null = null;
let readingFindByCodeCallCount = 0;
let readingReadConnections: Array<DatabaseReservedConnection | undefined> = [];
let writingSettingsResult = writingSettingsRow;
let writingSubmissionResult: WritingSubmissionRow | null = writingSubmissionRow;
let writingListResult: WritingMaterialListRow[] = [];
let writingCountResult: WritingCountRow = { total: 0 };
let writingGetMaterialCallCount = 0;
let writingMaterialResult: WritingMaterialRow | null = writingMaterialRow;
let writingInsertPayload: CreateWritingSubmissionPayload | null = null;
let writingUpdatePayload: UpdateWritingSubmissionPayload | null = null;
let writingAnalysisPayload: SaveWritingAnalysisPayload | null = null;
const fakeTrx = {} as DatabaseReservedConnection;

const toGrammarSessionRow = (session: GrammarSession): GrammarSessionRow => ({
  id: 1,
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
});

const toGrammarQuestionRow = (question: GrammarQuestion, index: number): GrammarQuestionRow => ({
  id: index + 1,
  question_number: question.question_number,
  question_type: question.question_type,
  grammar_area: question.grammar_area,
  grammar_point: question.grammar_point,
  level: question.level,
  question_text: question.question_text,
  user_answer: question.answer?.user_answer ?? null,
  answer_result: question.answer?.result ?? null,
  feedback: question.answer?.feedback ?? null,
  answered_at: question.answer?.answered_at ?? null,
  evaluated_at: question.answer?.evaluated_at ?? null,
});

mock.module('../src/core/database/client', () => ({
  startTransaction: async () => fakeTrx,
  commitTransaction: async () => {
    committedTransactionCount += 1;
  },
  rollbackTransaction: async () => {
    rolledBackTransactionCount += 1;
  },
}));

mock.module('../src/modules/finance/finance-category/finance-category.repository', () => ({
  getAllActiveByCodesAndType: async () => financeCategories,
}));

mock.module('../src/modules/finance/finance.repository', () => ({
  getOneSummaryByDateRange: async () => ({ expense_total: '12500', income_total: '50000', net_total: '37500' }),
  getAllCategorySummariesByDateRange: async () => [
    {
      category_code: 'food_drink',
      category_name: 'Makanan & Minuman',
      category_description: 'Food and drinks.',
      category_type: 'expense',
      total: '12500',
    },
  ],
  getAllDailySummariesByDateRange: async (_input: FinanceDailySummaryQuery) => financeDailySummaryResult,
}));

mock.module('../src/modules/notes/notes.repository', () => ({
  getOneByCode: async () => noteResult,
  updateOneByCode: async () => noteResult,
  softDeleteOneByCode: async () => noteResult !== null,
}));

mock.module('../src/modules/junk/junk.repository', () => ({
  getOneByCode: async () => junkResult,
  updateOneByCode: async () => junkResult,
  softDeleteOneByCode: async () => junkResult !== null,
}));

mock.module('../src/modules/grammar/grammar.repository', () => ({
  getLastSequenceByDateForUpdate: async () => ({ sequence: 0 }),
  insertOne: async () => ({ id: 1 }),
  insertAllQuestions: async () => undefined,
  getAll: async () => grammarListResult,
  countAll: async () => grammarCountResult,
  getOneByCode: async () => toGrammarSessionRow(grammarLockedSessionResult),
  getOneByCodeForUpdate: async (_code: string, trx: DatabaseReservedConnection) => {
    grammarReadConnections.push(trx);

    return toGrammarSessionRow(grammarLockedSessionResult);
  },
  getAllQuestionsBySessionId: async (_sessionId: number, trx?: DatabaseReservedConnection) => {
    grammarReadConnections.push(trx);

    return grammarLockedSessionResult.questions.map(toGrammarQuestionRow);
  },
  upsertAllAnswersByCodeAndQuestionNumbers: async (
    _code: string,
    payload: SaveAnswersPayload,
    _trx: DatabaseReservedConnection,
  ) => {
    grammarAnswerWriteCount += 1;
    grammarAnswersPayloadResult = payload;
  },
  updateOneCompletionByCode: async (code: string, score: number, max_score: number) => {
    grammarCompletionWriteCount += 1;
    grammarCompletionResult = { code, score, max_score };
    grammarLockedSessionResult = {
      ...grammarLockedSessionResult,
      status: 'completed',
      score,
      max_score,
      completed_at: '2026-09-05T11:00:00.000Z',
    };
  },
}));

mock.module('../src/modules/reading/reading-setting/reading-setting.repository', () => ({
  getOne: async () => readingSettingsResult,
  updateOne: async () => readingSettingsResult,
}));

mock.module('../src/modules/reading/reading.repository', () => ({
  getLastSequenceByDateForUpdate: async () => ({ sequence: 0 }),
  insertOne: async () => ({ id: readingMaterialRow.id }),
  insertAllQuestions: async () => undefined,
  getOneByCode: async (_code: string, trx?: DatabaseReservedConnection) => {
    readingReadConnections.push(trx);
    if (trx === undefined) readingFindByCodeCallCount += 1;
    return readingMaterialResult;
  },
  getAllQuestionsByMaterialId: async (_materialId: number, trx?: DatabaseReservedConnection) => {
    readingReadConnections.push(trx);
    return readingQuestionsResult;
  },
  getAll: async () => readingListResult,
  getOneIdByCodeForUpdate: async () => (readingMaterialResult === null ? null : { id: 1 }),
  upsertOneSubmissionByMaterialId: async () => ({ id: 1 }),
  softDeleteAllAnswersByMaterialIdAndQuestionNumbers: async () => undefined,
  updateOneStatusByCode: async () => ({ id: 1 }),
  upsertAllAnswersByMaterialId: async (
    _materialId: number,
    _submissionId: number,
    payload: SaveReadingAnswersPayload,
    _trx: DatabaseReservedConnection,
  ) => {
    readingSubmissionPayloadResult = payload;
  },
}));

mock.module('../src/modules/writing/writing-setting/writing-setting.repository', () => ({
  getOne: async () => writingSettingsResult,
  updateOne: async () => writingSettingsResult,
}));

mock.module('../src/modules/writing/writing-material/writing-material.repository', () => ({
  getLastSequenceByDateForUpdate: async () => ({ sequence: 0 }),
  insertOne: async () => writingMaterialRow,
  getOneByCode: async () => {
    writingGetMaterialCallCount += 1;
    return writingMaterialResult;
  },
  getAll: async () => writingListResult,
  countAll: async () => writingCountResult,
}));

mock.module('../src/modules/writing/writing-submission/writing-submission.repository', () => ({
  getLastSequenceByDateForUpdate: async () => ({ sequence: 0 }),
  insertOne: async (code: string, input: CreateWritingSubmissionPayload) => {
    writingInsertPayload = input;
    return {
      ...writingSubmissionRow,
      code,
      ...input,
      estimated_topic: null,
      estimated_genre: null,
      estimated_tags: null,
      estimated_level: null,
      analysis: null,
      analyzed_at: null,
    };
  },
  getOneByCode: async () => writingSubmissionResult,
  getOneByCodeForUpdate: async () => writingSubmissionResult,
  updateOne: async (_code: string, _material_code: string | null, input: UpdateWritingSubmissionPayload) => {
    writingUpdatePayload = input;
    return { ...writingSubmissionRow, ...input };
  },
  updateOneAnalysis: async (_code: string, _material_code: string | null, input: SaveWritingAnalysisPayload) => {
    writingAnalysisPayload = input;
    return { ...writingSubmissionRow, ...input };
  },
}));

const financeService = await import('../src/modules/finance/finance.service');
const grammarService = await import('../src/modules/grammar/grammar.service');
const junkService = await import('../src/modules/junk/junk.service');
const notesService = await import('../src/modules/notes/notes.service');
const readingSettingService = await import('../src/modules/reading/reading-setting/reading-setting.service');
const readingService = await import('../src/modules/reading/reading.service');
const writingSettingService = await import('../src/modules/writing/writing-setting/writing-setting.service');
const writingMaterialService = await import('../src/modules/writing/writing-material/writing-material.service');
const writingSubmissionService = await import('../src/modules/writing/writing-submission/writing-submission.service');

beforeEach(() => {
  financeCategories = [];
  financeDailySummaryResult = [];
  grammarLockedSessionResult = grammarSession;
  grammarListResult = [];
  grammarCountResult = { total: 0 };
  grammarAnswerWriteCount = 0;
  grammarAnswersPayloadResult = null;
  grammarCompletionWriteCount = 0;
  grammarCompletionResult = null;
  grammarReadConnections = [];
  committedTransactionCount = 0;
  rolledBackTransactionCount = 0;
  noteResult = null;
  junkResult = null;
  readingSettingsResult = readingSettingsRow;
  readingMaterialResult = readingMaterialRow;
  readingQuestionsResult = readingQuestionRows;
  readingListResult = [];
  readingSubmissionPayloadResult = null;
  readingFindByCodeCallCount = 0;
  readingReadConnections = [];
  writingSettingsResult = writingSettingsRow;
  writingSubmissionResult = writingSubmissionRow;
  writingListResult = [];
  writingCountResult = { total: 0 };
  writingGetMaterialCallCount = 0;
  writingMaterialResult = writingMaterialRow;
  writingInsertPayload = null;
  writingUpdatePayload = null;
  writingAnalysisPayload = null;
});

test('finance rejects a category that does not match the transaction type', async () => {
  await expect(
    financeService.createTransactions({
      date: '2026-09-05',
      type: 'expense',
      raw_text: '12, lunch',
      transactions: [{ amount: 12_000, category_code: 'salary', name: 'Lunch', location: null, note: null }],
    }),
  ).rejects.toMatchObject({
    code: 'INVALID_TRANSACTION_CATEGORY',
    statusCode: 400,
    details: { codes: ['salary'] },
  });
});

test('finance calculates numeric totals from repository aggregate rows', async () => {
  const result = await financeService.getSummary({ from: '2026-09-01', to: '2026-09-05', mode: 'net' });

  expect(result).toMatchObject({ expense_total: 12_500, income_total: 50_000, net_total: 37_500 });
  expect(result.by_category[0]?.total).toBe(12_500);
});

test('finance composes daily summary totals from repository rows', async () => {
  financeDailySummaryResult = [
    {
      date: '2026-09-01T00:00:00.000Z',
      expense_total: '12500',
      income_total: '50000',
      net_total: '37500',
    },
  ];

  const result = await financeService.getDailySummary({ from: '2026-09-01', to: '2026-09-05' });

  expect(result).toEqual([
    {
      date: '2026-09-01',
      expense_total: 12_500,
      income_total: 50_000,
      net_total: 37_500,
    },
  ]);
});

test('create flows return the transaction-local result without a post-commit read', async () => {
  const createdGrammarSession = await grammarService.createSession({
    mode: 'practice',
    source: 'request',
    level: 'A1',
    questions: [
      {
        question_type: 'fill_blank',
        grammar_area: 'tenses',
        grammar_point: 'simple past',
        level: 'A1',
        question_text: 'She ___ yesterday.',
        correct_answer: 'went',
        explanation: 'Use the simple past.',
      },
    ],
  });
  const createdReadingMaterial = await readingService.createMaterial({
    title: 'Morning market',
    level: 'A1',
    genre: 'story',
    tags: [],
    target_word_count: 300,
    content_text: 'Mira visits the market.',
    source: 'request',
    questions: [{ question_text: 'Who visits?', expected_answer: 'Mira.' }],
    target_question_count: 1,
  });
  const createdWritingMaterial = await writingMaterialService.createMaterial({
    topic: writingMaterial.topic,
    prompt_text: writingMaterial.prompt_text,
    level: writingMaterial.level,
    genre: writingMaterial.genre,
    tags: [],
    target_word_count: writingMaterial.target_word_count,
    source: writingMaterial.source,
  });
  const submittedReadingMaterial = await readingService.saveAnswers(readingMaterial.code, {
    answers: [
      { question_number: 1, user_answer: 'Mira.' },
      { question_number: 2, user_answer: 'The market.' },
      { question_number: 3, user_answer: 'Morning.' },
    ],
  });

  expect(createdGrammarSession).toEqual(grammarSession);
  expect(grammarReadConnections).toEqual([fakeTrx, fakeTrx]);
  expect(createdReadingMaterial).toEqual(readingMaterial);
  expect(createdWritingMaterial).toEqual(writingMaterial);
  expect(submittedReadingMaterial).toEqual(readingMaterial);
  expect(readingSubmissionPayloadResult).toEqual({
    answers: [
      { question_number: 1, user_answer: 'Mira.' },
      { question_number: 2, user_answer: 'The market.' },
      { question_number: 3, user_answer: 'Morning.' },
    ],
  });
  expect(readingFindByCodeCallCount).toBe(0);
  expect(readingReadConnections).toEqual(Array(5).fill(fakeTrx));
  expect(writingGetMaterialCallCount).toBe(0);
  expect(committedTransactionCount).toBe(4);
});

test('grammar reads use the pool outside a transaction and the same reserved connection while saving', async () => {
  await expect(grammarService.getSession(grammarSession.code)).resolves.toEqual(grammarSession);
  expect(grammarReadConnections).toEqual([undefined]);

  grammarReadConnections = [];

  await grammarService.saveAnswers(grammarSession.code, {
    answers: [{ question_number: 1, user_answer: 'went', result: 'correct' }],
  });

  expect(grammarReadConnections).toEqual([fakeTrx, fakeTrx, fakeTrx]);
  expect(grammarAnswerWriteCount).toBe(1);
  expect(committedTransactionCount).toBe(1);
  expect(rolledBackTransactionCount).toBe(0);
});

test('reading and writing services compose list responses from repository rows', async () => {
  const longPrompt = 'x'.repeat(201);
  readingListResult = [
    {
      code: readingMaterial.code,
      title: readingMaterial.title,
      content_excerpt: 'Mira visits the market.',
      genre: readingMaterial.genre,
      level: readingMaterial.level,
      tags: readingMaterial.tags,
      reading_status: 'read',
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ];
  writingListResult = [
    {
      code: writingMaterial.code,
      topic: writingMaterial.topic,
      prompt_text: longPrompt,
      genre: writingMaterial.genre,
      level: writingMaterial.level,
      target_word_count: writingMaterial.target_word_count,
      tags: writingMaterial.tags,
      source: writingMaterial.source,
      submission_count: '2',
      analyzed_submission_count: '1',
      latest_submission_code: 'WS-20260905-002',
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ];
  writingCountResult = { total: '21' };

  await expect(readingService.listMaterials({ limit: 100, sort: 'newest' })).resolves.toEqual({
    items: readingListResult.map((row) => ({ ...row, created_at: String(row.created_at) })),
  });
  await expect(writingMaterialService.listMaterials({ page: 2, limit: 20, sort: 'newest' })).resolves.toEqual({
    items: [
      {
        code: writingMaterial.code,
        topic: writingMaterial.topic,
        prompt_excerpt: `${'x'.repeat(197)}...`,
        genre: writingMaterial.genre,
        level: writingMaterial.level,
        target_word_count: writingMaterial.target_word_count,
        tags: writingMaterial.tags,
        source: writingMaterial.source,
        status: 'reviewed',
        submission_count: 2,
        analyzed_submission_count: 1,
        unanalyzed_submission_count: 1,
        latest_submission_code: 'WS-20260905-002',
        created_at: '2026-09-05T10:00:00.000Z',
      },
    ],
    meta: { page: 2, limit: 20, total: 21, total_pages: 2 },
  });
});

test('grammar service composes list responses from repository rows', async () => {
  grammarListResult = [
    {
      code: grammarSession.code,
      mode: grammarSession.mode,
      source: grammarSession.source,
      status: grammarSession.status,
      level: grammarSession.level,
      grammar_area: 'tenses',
      grammar_point: 'simple past',
      question_count: '5',
      answered_question_count: '3',
      score: null,
      max_score: null,
      started_at: '2026-09-05T10:00:00.000Z',
      completed_at: null,
    },
  ];
  grammarCountResult = { total: '21' };

  await expect(
    grammarService.listSessions({
      q: 'past',
      status: 'active',
      mode: 'practice',
      level: 'A1',
      page: 2,
      limit: 20,
      sort: 'newest',
    }),
  ).resolves.toEqual({
    items: [
      {
        code: grammarSession.code,
        mode: 'practice',
        source: 'request',
        status: 'active',
        level: 'A1',
        grammar_area: 'tenses',
        grammar_point: 'simple past',
        question_count: 5,
        answered_question_count: 3,
        score: null,
        max_score: null,
        started_at: '2026-09-05T10:00:00.000Z',
        completed_at: null,
      },
    ],
    meta: { page: 2, limit: 20, total: 21, total_pages: 2 },
  });
});

test('notes returns a stable domain error when a note is absent', async () => {
  await expect(notesService.getDetail({ code: 'NT-20260905-001' })).rejects.toMatchObject({
    code: 'NOTE_NOT_FOUND',
    statusCode: 404,
  });
});

test('junk returns a stable domain error when an item is absent', async () => {
  await expect(junkService.remove({ code: 'JK-20260905-001' })).rejects.toMatchObject({
    code: 'JUNK_ITEM_NOT_FOUND',
    statusCode: 404,
  });
});

test('junk formats category and tags without changing separators needed for filtering', async () => {
  junkResult = {
    code: 'JK-20260928-001',
    title: 'Saved item',
    category: 'personal-growth',
    raw_text: null,
    content_text: 'A useful item',
    source_url: null,
    source_name: null,
    tags: ['advisory-lock', 'api_v1'],
    created_at: '2026-09-28T00:00:00.000Z',
    updated_at: '2026-09-28T00:00:00.000Z',
    deleted_at: null,
  };
  const detail = await junkService.getDetail({ code: 'JK-20260928-001' });
  expect(detail.category).toBe('Personal-Growth');
  expect(detail.tags).toEqual(['Advisory-Lock', 'Api_V1']);
  await expect(junkService.update({ code: detail.code }, { title: null, content_text: null })).rejects.toMatchObject({
    code: 'JUNK_CONTENT_REQUIRED',
    statusCode: 400,
  });
});

test('grammar requires immediate evaluation for practice answers', async () => {
  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [{ question_number: 1, user_answer: 'went' }],
    }),
  ).rejects.toMatchObject({ code: 'PRACTICE_EVALUATION_REQUIRED', statusCode: 400 });
  expect(grammarAnswerWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar defers individual evaluation for exam answers', async () => {
  grammarLockedSessionResult = { ...grammarSession, mode: 'exam' };

  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [{ question_number: 1, user_answer: 'went', result: 'correct', feedback: null }],
    }),
  ).rejects.toMatchObject({ code: 'EXAM_EVALUATION_DEFERRED', statusCode: 400 });
  expect(grammarAnswerWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar saves exam answers without results in one bulk write', async () => {
  grammarLockedSessionResult = {
    ...grammarSession,
    mode: 'exam',
    question_count: 2,
    questions: [grammarQuestion, { ...grammarQuestion, question_number: 2, grammar_point: 'subject verb agreement' }],
  };

  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [
        { question_number: 1, user_answer: 'went' },
        { question_number: 2, user_answer: 'He walk every day.' },
      ],
    }),
  ).resolves.toMatchObject({ mode: 'exam', status: 'active' });

  expect(grammarAnswerWriteCount).toBe(1);
  expect(grammarAnswersPayloadResult).toEqual({
    answers: [
      { question_number: 1, user_answer: 'went', result: null, feedback: null },
      { question_number: 2, user_answer: 'He walk every day.', result: null, feedback: null },
    ],
  });
  expect(grammarCompletionWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(1);
});

test('grammar completes an active practice session once every question has an answer', async () => {
  const answeredAt = '2026-09-05T10:05:00.000Z';
  grammarLockedSessionResult = {
    ...grammarSession,
    question_count: 2,
    questions: [
      {
        ...grammarQuestion,
        answer: {
          user_answer: 'went',
          result: 'correct',
          feedback: null,
          answered_at: answeredAt,
          evaluated_at: answeredAt,
        },
      },
      {
        ...grammarQuestion,
        question_number: 2,
        grammar_point: 'subject verb agreement',
        answer: {
          user_answer: 'He walk every day.',
          result: 'incorrect',
          feedback: null,
          answered_at: answeredAt,
          evaluated_at: answeredAt,
        },
      },
    ],
  };

  const result = await grammarService.saveAnswers(grammarSession.code, {
    answers: [{ question_number: 2, user_answer: 'He walks every day.', result: 'incorrect', feedback: 'Use walks.' }],
  });

  expect(grammarAnswerWriteCount).toBe(1);
  expect(grammarCompletionWriteCount).toBe(1);
  expect(grammarCompletionResult).toEqual({ code: grammarSession.code, score: 1, max_score: 2 });
  expect(result.status).toBe('completed');
  expect(result.score).toBe(1);
  expect(result.max_score).toBe(2);
  expect(committedTransactionCount).toBe(1);
});

test('grammar keeps an incomplete practice session active', async () => {
  const result = await grammarService.saveAnswers(grammarSession.code, {
    answers: [{ question_number: 1, user_answer: 'went', result: 'correct' }],
  });

  expect(grammarAnswerWriteCount).toBe(1);
  expect(grammarCompletionWriteCount).toBe(0);
  expect(result.status).toBe('active');
  expect(committedTransactionCount).toBe(1);
});

test('grammar rejects answers that reference unknown questions without writing', async () => {
  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [{ question_number: 5, user_answer: 'went', result: 'correct' }],
    }),
  ).rejects.toMatchObject({ code: 'INVALID_GRAMMAR_ANSWERS', statusCode: 400 });
  expect(grammarAnswerWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar rejects duplicate question numbers without writing', async () => {
  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [
        { question_number: 1, user_answer: 'went', result: 'correct' },
        { question_number: 1, user_answer: 'go', result: 'correct' },
      ],
    }),
  ).rejects.toMatchObject({ code: 'INVALID_GRAMMAR_ANSWERS', statusCode: 400 });
  expect(grammarAnswerWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar rejects an answer when the locked session is no longer active', async () => {
  grammarLockedSessionResult = { ...grammarSession, status: 'completed' };

  await expect(
    grammarService.saveAnswers(grammarSession.code, {
      answers: [{ question_number: 1, user_answer: 'went', result: 'correct', feedback: null }],
    }),
  ).rejects.toMatchObject({ code: 'GRAMMAR_SESSION_INACTIVE', statusCode: 409 });

  expect(grammarAnswerWriteCount).toBe(0);
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar rejects an evaluation when the locked session is no longer active', async () => {
  grammarLockedSessionResult = {
    ...grammarSession,
    mode: 'exam',
    status: 'completed',
    questions: [
      {
        ...grammarQuestion,
        answer: { user_answer: 'went', result: null, feedback: null, answered_at: null, evaluated_at: null },
      },
    ],
  };

  await expect(
    grammarService.evaluateSession(grammarSession.code, {
      answers: [{ question_number: 1, result: 'correct', feedback: null }],
    }),
  ).rejects.toMatchObject({ code: 'GRAMMAR_SESSION_INACTIVE', statusCode: 409 });

  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('grammar rejects an incomplete exam evaluation', async () => {
  grammarLockedSessionResult = {
    ...grammarSession,
    mode: 'exam',
    question_count: 2,
    questions: [
      {
        ...grammarQuestion,
        answer: { user_answer: 'went', result: null, feedback: null, answered_at: null, evaluated_at: null },
      },
      {
        ...grammarQuestion,
        question_number: 2,
        answer: { user_answer: 'did', result: null, feedback: null, answered_at: null, evaluated_at: null },
      },
    ],
  };

  await expect(
    grammarService.evaluateSession(grammarSession.code, {
      answers: [{ question_number: 1, result: 'correct', feedback: null }],
    }),
  ).rejects.toMatchObject({ code: 'INCOMPLETE_EXAM_EVALUATION', statusCode: 400 });
});

test('reading settings keep the default word count inside the configured range', async () => {
  await expect(readingSettingService.updateSettings({ min_word_count: 320 })).rejects.toMatchObject({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
  });
});

test('reading rejects duplicate question numbers in optional answers', async () => {
  await expect(
    readingService.saveAnswers(readingMaterial.code, {
      answers: [
        { question_number: 1, user_answer: 'Mira' },
        { question_number: 1, user_answer: 'Mira again' },
        { question_number: 3, user_answer: 'Morning' },
      ],
    }),
  ).rejects.toMatchObject({ code: 'INVALID_READING_ANSWERS', statusCode: 400 });
});

test('writing settings keep the default word count inside the configured range', async () => {
  await expect(writingSettingService.updateSettings({ max_word_count: 140 })).rejects.toMatchObject({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
  });
});

test('writing exposes corrected text without rebuilding the analysis', async () => {
  await expect(writingSubmissionService.getCorrectedText(writingSubmission.code)).resolves.toEqual({
    code: writingSubmission.code,
    corrected_text: writingAnalysis.corrected_text,
  });
});

test('writing saves free and prompted submissions without analysis', async () => {
  const original_text = '  I write freely.\n';
  const free = await writingSubmissionService.createSubmission({ original_text });

  expect(free).toMatchObject({
    original_text,
    word_count: 3,
    material_code: null,
    analysis_status: 'not_analyzed',
    estimated_topic: null,
    estimated_genre: null,
    estimated_tags: null,
    estimated_level: null,
    analysis: null,
    analyzed_at: null,
  });
  expect(free.code).toMatch(/^WS-\d{8}-001$/);
  expect(writingGetMaterialCallCount).toBe(0);
  expect(writingInsertPayload).toEqual({ material_id: null, material_code: null, original_text, word_count: 3 });

  const prompted = await writingSubmissionService.createSubmission({
    material_code: writingMaterial.code,
    original_text,
  });

  expect(prompted.material_code).toBe(writingMaterial.code);
  expect(writingInsertPayload?.material_id).toBe(1);
  expect(writingGetMaterialCallCount).toBe(1);
  expect(committedTransactionCount).toBe(2);
});

test('writing rejects an inactive material before inserting a submission', async () => {
  writingMaterialResult = null;

  await expect(
    writingSubmissionService.createSubmission({ material_code: writingMaterial.code, original_text: 'My draft.' }),
  ).rejects.toMatchObject({ statusCode: 404, code: 'WRITING_MATERIAL_NOT_FOUND' });
  expect(writingInsertPayload).toBeNull();
  expect(rolledBackTransactionCount).toBe(1);
});

test('writing rejects the entire text and metadata edit after analysis', async () => {
  await expect(
    writingSubmissionService.updateSubmission(writingSubmission.code, {
      original_text: writingSubmission.original_text,
      estimated_topic: 'Sports',
    }),
  ).rejects.toMatchObject({ statusCode: 409, code: 'WRITING_SUBMISSION_TEXT_LOCKED' });

  expect(writingUpdatePayload).toBeNull();
  expect(committedTransactionCount).toBe(0);
  expect(rolledBackTransactionCount).toBe(1);
});

test('writing permits metadata corrections after analysis without changing feedback', async () => {
  const result = await writingSubmissionService.updateSubmission(writingSubmission.code, { estimated_tags: [] });

  expect(writingUpdatePayload).toEqual({ estimated_tags: [], word_count: undefined });
  expect(result.analysis).toEqual(writingAnalysis);
  expect(result.analyzed_at).toBe(writingSubmission.analyzed_at);
  expect(result.estimated_tags).toEqual([]);
  expect(committedTransactionCount).toBe(1);
});

test('writing recalculates word count while preserving edited draft text', async () => {
  writingSubmissionResult = { ...writingSubmissionRow, analysis: null, analyzed_at: null };
  const original_text = '  My revised draft has five words.\n';
  const result = await writingSubmissionService.updateSubmission(writingSubmission.code, { original_text });

  expect(writingUpdatePayload).toEqual({ original_text, word_count: 6 });
  expect(result.original_text).toBe(original_text);
  expect(result.word_count).toBe(6);
});

const writingAnalysisInput = {
  estimated_topic: 'Work',
  estimated_genre: 'journal',
  estimated_tags: ['work'],
  estimated_level: 'A1' as const,
  analysis: writingAnalysis,
};

test('writing rejects repeated analysis without replacing existing feedback', async () => {
  await expect(
    writingSubmissionService.saveAnalysis(writingSubmission.code, writingAnalysisInput),
  ).rejects.toMatchObject({ statusCode: 409, code: 'WRITING_SUBMISSION_ALREADY_ANALYZED' });

  expect(writingAnalysisPayload).toBeNull();
  expect(rolledBackTransactionCount).toBe(1);
});

test('writing validates prompt adherence against the saved material association', async () => {
  writingSubmissionResult = { ...writingSubmissionRow, material_code: null, analysis: null, analyzed_at: null };

  await expect(
    writingSubmissionService.saveAnalysis(writingSubmission.code, writingAnalysisInput),
  ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  expect(writingAnalysisPayload).toBeNull();

  await writingSubmissionService.saveAnalysis(writingSubmission.code, {
    ...writingAnalysisInput,
    analysis: { ...writingAnalysis, prompt_adherence: null },
  });

  expect(writingAnalysisPayload?.analysis.prompt_adherence).toBeNull();
  expect(committedTransactionCount).toBe(1);

  writingSubmissionResult = { ...writingSubmissionRow, analysis: null, analyzed_at: null };

  await expect(
    writingSubmissionService.saveAnalysis(writingSubmission.code, {
      ...writingAnalysisInput,
      analysis: { ...writingAnalysis, prompt_adherence: null },
    }),
  ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
});

test('writing returns stable errors for missing submissions and unavailable corrected text', async () => {
  writingSubmissionResult = null;

  await expect(writingSubmissionService.getSubmission(writingSubmission.code)).rejects.toMatchObject({
    statusCode: 404,
    code: 'WRITING_SUBMISSION_NOT_FOUND',
  });
  await expect(
    writingSubmissionService.updateSubmission(writingSubmission.code, { estimated_topic: 'Sports' }),
  ).rejects.toMatchObject({ statusCode: 404, code: 'WRITING_SUBMISSION_NOT_FOUND' });
  await expect(
    writingSubmissionService.saveAnalysis(writingSubmission.code, writingAnalysisInput),
  ).rejects.toMatchObject({ statusCode: 404, code: 'WRITING_SUBMISSION_NOT_FOUND' });

  writingSubmissionResult = { ...writingSubmissionRow, analysis: null, analyzed_at: null };

  await expect(writingSubmissionService.getCorrectedText(writingSubmission.code)).rejects.toMatchObject({
    statusCode: 409,
    code: 'WRITING_SUBMISSION_NOT_ANALYZED',
  });
});
