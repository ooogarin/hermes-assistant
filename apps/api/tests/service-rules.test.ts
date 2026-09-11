import { beforeEach, expect, mock, test } from 'bun:test';
import { writingAnalysis } from './fixtures/writing';
import type { DatabaseReservedConnection } from '../src/core/database/database.types';
import type {
  GrammarCountRow,
  GrammarQuestion,
  GrammarQuestionRow,
  GrammarSession,
  GrammarSessionListRow,
  GrammarSessionRow,
} from '../src/modules/grammar/grammar.types';
import type {
  ReadingMaterial,
  ReadingMaterialListRow,
  ReadingMaterialRow,
  ReadingQuestionWithAnswerRow,
  ReadingSettings,
  ReadingSettingsRow,
  SaveReadingSubmissionPayload,
} from '../src/modules/reading/reading.types';
import type {
  WritingCountRow,
  WritingMaterial,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSettings,
  WritingSettingsRow,
  WritingSubmission,
  WritingSubmissionRow,
} from '../src/modules/writing/writing.types';

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
  is_override: false,
  source: 'request',
};

const readingSettings: ReadingSettings = {
  default_level: 'A1',
  default_word_count: 300,
  min_word_count: 250,
  max_word_count: 350,
  updated_at: '2026-09-05T10:00:00.000Z',
};

const readingMaterial: ReadingMaterial = {
  code: 'RD-20260905-001',
  topic: 'Morning market',
  level: 'A1',
  genre: 'story',
  tags: [],
  target_word_count: 300,
  word_count: 5,
  passage_text: 'Mira visits the morning market.',
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
  min_word_count: readingSettings.min_word_count,
  max_word_count: readingSettings.max_word_count,
  updated_at: readingSettings.updated_at,
};

const readingMaterialRow: ReadingMaterialRow = {
  id: 1,
  code: readingMaterial.code,
  topic: readingMaterial.topic,
  level: readingMaterial.level,
  genre: readingMaterial.genre,
  tags: readingMaterial.tags,
  target_word_count: readingMaterial.target_word_count,
  word_count: readingMaterial.word_count,
  passage_text: readingMaterial.passage_text,
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
  submission_number: 1,
  original_text: 'I go yesterday.',
  word_count: 3,
  estimated_level: 'A1',
  analysis: writingAnalysis,
  submitted_at: '2026-09-05T10:00:00.000Z',
};

const writingSettingsRow: WritingSettingsRow = {
  default_level: writingSettings.default_level,
  default_word_count: writingSettings.default_word_count,
  min_word_count: writingSettings.min_word_count,
  max_word_count: writingSettings.max_word_count,
  updated_at: writingSettings.updated_at,
};

const writingMaterialRow: WritingMaterialRow = {
  code: writingMaterial.code,
  topic: writingMaterial.topic,
  prompt_text: writingMaterial.prompt_text,
  level: writingMaterial.level,
  genre: writingMaterial.genre,
  tags: writingMaterial.tags,
  target_word_count: writingMaterial.target_word_count,
  is_override: writingMaterial.is_override,
  source: writingMaterial.source,
};

const writingSubmissionRow: WritingSubmissionRow = {
  submission_number: writingSubmission.submission_number,
  original_text: writingSubmission.original_text,
  word_count: writingSubmission.word_count,
  estimated_level: writingSubmission.estimated_level,
  analysis: writingSubmission.analysis,
  submitted_at: writingSubmission.submitted_at,
};

let financeCategories: Array<{ id: number; code: string; name: string; description: string; type: 'expense' }> = [];
let grammarLockedSessionResult: GrammarSession = grammarSession;
let grammarListResult: GrammarSessionListRow[] = [];
let grammarCountResult: GrammarCountRow = { total: 0 };
let grammarAnswerWriteCount = 0;
let committedTransactionCount = 0;
let rolledBackTransactionCount = 0;
let noteResult: { code: string } | null = null;
let junkResult: { code: string } | null = null;
let readingSettingsResult = readingSettingsRow;
let readingMaterialResult: ReadingMaterialRow | null = readingMaterialRow;
let readingQuestionsResult: ReadingQuestionWithAnswerRow[] = readingQuestionRows;
let readingListResult: ReadingMaterialListRow[] = [];
let readingCountResult: { total: number | string } = { total: 0 };
let readingSubmissionPayloadResult: SaveReadingSubmissionPayload | null = null;
let readingFindByCodeCallCount = 0;
let writingSettingsResult = writingSettingsRow;
let writingSubmissionResult: WritingSubmissionRow | null = writingSubmissionRow;
let writingListResult: WritingMaterialListRow[] = [];
let writingCountResult: WritingCountRow = { total: 0 };
let writingGetMaterialCallCount = 0;
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

mock.module('../src/modules/finance/finance.repository', () => ({
  getActiveCategoriesByCodes: async () => financeCategories,
  getSummaryTotals: async () => ({ expense_total: '12500', income_total: '50000' }),
  getSummaryByCategory: async () => [
    {
      category_code: 'food_drink',
      category_name: 'Makanan & Minuman',
      category_description: 'Food and drinks.',
      category_type: 'expense',
      total: '12500',
    },
  ],
}));

mock.module('../src/modules/notes/notes.repository', () => ({
  findByCode: async () => noteResult,
  updateByCode: async () => noteResult,
  softDeleteByCode: async () => noteResult !== null,
}));

mock.module('../src/modules/junk/junk.repository', () => ({
  findByCode: async () => junkResult,
  updateByCode: async () => junkResult,
  softDeleteByCode: async () => junkResult !== null,
}));

mock.module('../src/modules/grammar/grammar.repository', () => ({
  getNextSequence: async () => ({ sequence: 0 }),
  insertSession: async () => ({ id: 1 }),
  insertQuestions: async () => undefined,
  listSessions: async () => grammarListResult,
  countSessions: async () => grammarCountResult,
  getSessionForUpdate: async () => toGrammarSessionRow(grammarLockedSessionResult),
  getQuestionsInTransaction: async () => grammarLockedSessionResult.questions.map(toGrammarQuestionRow),
  upsertAnswer: async () => {
    grammarAnswerWriteCount += 1;
    return { id: 1 };
  },
}));

mock.module('../src/modules/reading/reading.repository', () => ({
  getSettings: async () => readingSettingsResult,
  updateSettings: async () => readingSettingsResult,
  getNextSequence: async () => ({ sequence: 0 }),
  insertMaterial: async () => ({ id: readingMaterialRow.id }),
  insertQuestions: async () => undefined,
  findByCode: async () => {
    readingFindByCodeCallCount += 1;
    return readingMaterialResult;
  },
  findByCodeInTransaction: async () => readingMaterialResult,
  getQuestions: async () => readingQuestionsResult,
  getQuestionsInTransaction: async () => readingQuestionsResult,
  listMaterials: async () => readingListResult,
  countMaterials: async () => readingCountResult,
  insertSubmission: async () => ({ id: 1 }),
  insertAnswers: async (
    _trx: DatabaseReservedConnection,
    _code: string,
    _submissionId: number,
    payload: SaveReadingSubmissionPayload,
  ) => {
    readingSubmissionPayloadResult = payload;
  },
}));

mock.module('../src/modules/writing/writing.repository', () => ({
  getSettings: async () => writingSettingsResult,
  updateSettings: async () => writingSettingsResult,
  getNextSequence: async () => ({ sequence: 0 }),
  insertMaterial: async () => writingMaterialRow,
  getMaterial: async () => {
    writingGetMaterialCallCount += 1;
    return writingMaterialRow;
  },
  listMaterials: async () => writingListResult,
  countMaterials: async () => writingCountResult,
  getSubmission: async () => writingSubmissionResult,
}));

const financeService = await import('../src/modules/finance/finance.service');
const grammarService = await import('../src/modules/grammar/grammar.service');
const junkService = await import('../src/modules/junk/junk.service');
const notesService = await import('../src/modules/notes/notes.service');
const readingService = await import('../src/modules/reading/reading.service');
const writingService = await import('../src/modules/writing/writing.service');

beforeEach(() => {
  financeCategories = [];
  grammarLockedSessionResult = grammarSession;
  grammarListResult = [];
  grammarCountResult = { total: 0 };
  grammarAnswerWriteCount = 0;
  committedTransactionCount = 0;
  rolledBackTransactionCount = 0;
  noteResult = null;
  junkResult = null;
  readingSettingsResult = readingSettingsRow;
  readingMaterialResult = readingMaterialRow;
  readingQuestionsResult = readingQuestionRows;
  readingListResult = [];
  readingCountResult = { total: 0 };
  readingSubmissionPayloadResult = null;
  readingFindByCodeCallCount = 0;
  writingSettingsResult = writingSettingsRow;
  writingSubmissionResult = writingSubmissionRow;
  writingListResult = [];
  writingCountResult = { total: 0 };
  writingGetMaterialCallCount = 0;
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
    topic: 'Morning market',
    level: 'A1',
    genre: 'story',
    tags: [],
    target_word_count: 300,
    passage_text: 'Mira visits the market.',
    source: 'request',
    questions: [{ question_text: 'Who visits?', expected_answer: 'Mira.' }],
  });
  const createdWritingMaterial = await writingService.createMaterial({
    topic: writingMaterial.topic,
    prompt_text: writingMaterial.prompt_text,
    level: writingMaterial.level,
    genre: writingMaterial.genre,
    tags: [],
    target_word_count: writingMaterial.target_word_count,
    source: writingMaterial.source,
  });
  const submittedReadingMaterial = await readingService.saveSubmission(readingMaterial.code, {
    answers: [
      { question_number: 1, user_answer: 'Mira.' },
      { question_number: 2, user_answer: 'The market.' },
      { question_number: 3, user_answer: 'Morning.' },
    ],
  });

  expect(createdGrammarSession).toEqual(grammarSession);
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
  expect(readingFindByCodeCallCount).toBe(1);
  expect(writingGetMaterialCallCount).toBe(0);
  expect(committedTransactionCount).toBe(4);
});

test('reading and writing services compose list responses from repository rows', async () => {
  const longPrompt = 'x'.repeat(201);
  readingListResult = [
    {
      code: readingMaterial.code,
      topic: readingMaterial.topic,
      genre: readingMaterial.genre,
      level: readingMaterial.level,
      target_word_count: readingMaterial.target_word_count,
      word_count: readingMaterial.word_count,
      tags: readingMaterial.tags,
      source: readingMaterial.source,
      is_completed: true,
      question_count: '3',
      answered_question_count: '2',
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ];
  readingCountResult = { total: '21' };
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
      latest_submission_number: '2',
      created_at: '2026-09-05T10:00:00.000Z',
    },
  ];
  writingCountResult = { total: '21' };

  await expect(readingService.listMaterials({ page: 2, limit: 20, sort: 'newest' })).resolves.toEqual({
    items: [
      {
        code: readingMaterial.code,
        topic: readingMaterial.topic,
        genre: readingMaterial.genre,
        level: readingMaterial.level,
        target_word_count: readingMaterial.target_word_count,
        word_count: readingMaterial.word_count,
        tags: readingMaterial.tags,
        source: readingMaterial.source,
        status: 'completed',
        question_count: 3,
        answered_question_count: 2,
        created_at: '2026-09-05T10:00:00.000Z',
      },
    ],
    meta: { page: 2, limit: 20, total: 21, total_pages: 2 },
  });
  await expect(writingService.listMaterials({ page: 2, limit: 20, sort: 'newest' })).resolves.toEqual({
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
        latest_submission_number: 2,
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

test('grammar requires immediate evaluation for practice answers', async () => {
  await expect(grammarService.saveAnswer(grammarSession.code, 1, { user_answer: 'went' })).rejects.toMatchObject({
    code: 'PRACTICE_EVALUATION_REQUIRED',
    statusCode: 400,
  });
});

test('grammar defers individual evaluation for exam answers', async () => {
  grammarLockedSessionResult = { ...grammarSession, mode: 'exam' };

  await expect(
    grammarService.saveAnswer(grammarSession.code, 1, { user_answer: 'went', result: 'correct', feedback: null }),
  ).rejects.toMatchObject({ code: 'EXAM_EVALUATION_DEFERRED', statusCode: 400 });
});

test('grammar rejects an answer when the locked session is no longer active', async () => {
  grammarLockedSessionResult = { ...grammarSession, status: 'completed' };

  await expect(
    grammarService.saveAnswer(grammarSession.code, 1, {
      user_answer: 'went',
      result: 'correct',
      feedback: null,
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
  await expect(readingService.updateSettings({ min_word_count: 320 })).rejects.toMatchObject({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
  });
});

test('reading requires every question exactly once in a submission', async () => {
  await expect(
    readingService.saveSubmission(readingMaterial.code, {
      answers: [
        { question_number: 1, user_answer: 'Mira' },
        { question_number: 1, user_answer: 'Mira again' },
        { question_number: 3, user_answer: 'Morning' },
      ],
    }),
  ).rejects.toMatchObject({ code: 'INCOMPLETE_READING_SUBMISSION', statusCode: 400 });
});

test('writing settings keep the default word count inside the configured range', async () => {
  await expect(writingService.updateSettings({ max_word_count: 140 })).rejects.toMatchObject({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
  });
});

test('writing exposes corrected text without rebuilding the analysis', async () => {
  await expect(writingService.getCorrectedText('WR-20260905-001', 1)).resolves.toEqual({
    submission_number: 1,
    corrected_text: writingAnalysis.corrected_text,
  });
});
