import { beforeEach, expect, mock, test } from 'bun:test';
import { writingAnalysis } from './fixtures/writing';
import type { GrammarQuestion, GrammarSession } from '../src/modules/grammar/grammar.types';
import type { ReadingMaterial, ReadingSettings } from '../src/modules/reading/reading.types';
import type { WritingSettings, WritingSubmission } from '../src/modules/writing/writing.types';

const grammarQuestion: GrammarQuestion = {
  questionNumber: 1,
  questionType: 'fill_blank',
  grammarArea: 'tenses',
  grammarPoint: 'simple past',
  level: 'A1',
  questionText: 'She ___ (go) yesterday.',
  answer: null,
};

const grammarSession: GrammarSession = {
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
  questions: [grammarQuestion],
};

const readingSettings: ReadingSettings = {
  defaultLevel: 'A1',
  defaultWordCount: 300,
  minWordCount: 250,
  maxWordCount: 350,
  updatedAt: '2026-09-05T10:00:00.000Z',
};

const readingMaterial: ReadingMaterial = {
  code: 'RD-20260905-001',
  topic: 'Morning market',
  level: 'A1',
  genre: 'story',
  tags: [],
  targetWordCount: 300,
  wordCount: 5,
  passageText: 'Mira visits the morning market.',
  isOverride: false,
  source: 'request',
  questions: [
    { questionNumber: 1, questionText: 'Who visits?', userAnswer: null },
    { questionNumber: 2, questionText: 'Where?', userAnswer: null },
    { questionNumber: 3, questionText: 'When?', userAnswer: null },
  ],
};

const writingSettings: WritingSettings = {
  defaultLevel: 'A1',
  defaultWordCount: 150,
  minWordCount: 120,
  maxWordCount: 180,
  updatedAt: '2026-09-05T10:00:00.000Z',
};

const writingSubmission: WritingSubmission = {
  submissionNumber: 1,
  originalText: 'I go yesterday.',
  wordCount: 3,
  estimatedLevel: 'A1',
  analysis: writingAnalysis,
  submittedAt: '2026-09-05T10:00:00.000Z',
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
      rawText: '12, lunch',
      transactions: [{ amount: 12_000, categoryCode: 'salary', name: 'Lunch', location: null, note: null }],
    }),
  ).rejects.toMatchObject({
    code: 'INVALID_TRANSACTION_CATEGORY',
    statusCode: 400,
    details: { codes: ['salary'] },
  });
});

test('finance calculates numeric totals from repository aggregate rows', async () => {
  const result = await financeService.getSummary({ from: '2026-09-01', to: '2026-09-05', mode: 'net' });

  expect(result).toMatchObject({ expenseTotal: 12_500, incomeTotal: 50_000, netTotal: 37_500 });
  expect(result.byCategory[0]?.total).toBe(12_500);
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
  await expect(grammarService.saveAnswer(grammarSession.code, 1, { userAnswer: 'went' })).rejects.toMatchObject({
    code: 'PRACTICE_EVALUATION_REQUIRED',
    statusCode: 400,
  });
});

test('grammar defers individual evaluation for exam answers', async () => {
  grammarSessionResult = { ...grammarSession, mode: 'exam' };

  await expect(
    grammarService.saveAnswer(grammarSession.code, 1, { userAnswer: 'went', result: 'correct', feedback: null }),
  ).rejects.toMatchObject({ code: 'EXAM_EVALUATION_DEFERRED', statusCode: 400 });
});

test('grammar rejects an incomplete exam evaluation', async () => {
  grammarSessionResult = {
    ...grammarSession,
    mode: 'exam',
    questionCount: 2,
    questions: [
      {
        ...grammarQuestion,
        answer: { userAnswer: 'went', result: null, feedback: null, answeredAt: null, evaluatedAt: null },
      },
      {
        ...grammarQuestion,
        questionNumber: 2,
        answer: { userAnswer: 'did', result: null, feedback: null, answeredAt: null, evaluatedAt: null },
      },
    ],
  };

  await expect(
    grammarService.evaluateSession(grammarSession.code, {
      answers: [{ questionNumber: 1, result: 'correct', feedback: null }],
    }),
  ).rejects.toMatchObject({ code: 'INCOMPLETE_EXAM_EVALUATION', statusCode: 400 });
});

test('reading settings keep the default word count inside the configured range', async () => {
  await expect(readingService.updateSettings({ minWordCount: 320 })).rejects.toMatchObject({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
  });
});

test('reading requires every question exactly once in a submission', async () => {
  await expect(
    readingService.saveSubmission(readingMaterial.code, {
      answers: [
        { questionNumber: 1, userAnswer: 'Mira' },
        { questionNumber: 1, userAnswer: 'Mira again' },
        { questionNumber: 3, userAnswer: 'Morning' },
      ],
    }),
  ).rejects.toMatchObject({ code: 'INCOMPLETE_READING_SUBMISSION', statusCode: 400 });
});

test('writing settings keep the default word count inside the configured range', async () => {
  await expect(writingService.updateSettings({ maxWordCount: 140 })).rejects.toMatchObject({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
  });
});

test('writing exposes corrected text without rebuilding the analysis', async () => {
  await expect(writingService.getCorrectedText('WR-20260905-001', 1)).resolves.toEqual({
    submissionNumber: 1,
    correctedText: writingAnalysis.correctedText,
  });
});
