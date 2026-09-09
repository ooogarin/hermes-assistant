import { beforeEach, expect, mock, test } from 'bun:test';
import { writingAnalysis } from './fixtures/writing';
import type { GrammarQuestion, GrammarSession } from '../src/modules/grammar/grammar.types';
import type { ReadingMaterial, ReadingSettings } from '../src/modules/reading/reading.types';
import type { WritingSettings, WritingSubmission } from '../src/modules/writing/writing.types';

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

let financeCategories: Array<{ id: number; code: string; name: string; description: string; type: 'expense' }> = [];
let grammarSessionResult: GrammarSession | null = grammarSession;
let noteResult: { code: string } | null = null;
let junkResult: { code: string } | null = null;
let readingSettingsResult = readingSettings;
let readingMaterialResult: ReadingMaterial | null = readingMaterial;
let writingSettingsResult = writingSettings;
let writingSubmissionResult: WritingSubmission | null = writingSubmission;

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
  getSession: async () => grammarSessionResult,
}));

mock.module('../src/modules/reading/reading.repository', () => ({
  getSettings: async () => readingSettingsResult,
  updateSettings: async () => readingSettingsResult,
  findByCode: async () => readingMaterialResult,
}));

mock.module('../src/modules/writing/writing.repository', () => ({
  getSettings: async () => writingSettingsResult,
  updateSettings: async () => writingSettingsResult,
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
  grammarSessionResult = grammarSession;
  noteResult = null;
  junkResult = null;
  readingSettingsResult = readingSettings;
  readingMaterialResult = readingMaterial;
  writingSettingsResult = writingSettings;
  writingSubmissionResult = writingSubmission;
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
  grammarSessionResult = { ...grammarSession, mode: 'exam' };

  await expect(
    grammarService.saveAnswer(grammarSession.code, 1, { user_answer: 'went', result: 'correct', feedback: null }),
  ).rejects.toMatchObject({ code: 'EXAM_EVALUATION_DEFERRED', statusCode: 400 });
});

test('grammar rejects an incomplete exam evaluation', async () => {
  grammarSessionResult = {
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
