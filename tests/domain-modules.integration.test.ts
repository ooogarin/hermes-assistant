import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { configureDatabaseClient } from '../src/core/database/client';
import { loadMigrations, migrateDatabase } from '../src/core/database/migration-runner';
import * as financeService from '../src/modules/finance/finance.service';
import * as grammarService from '../src/modules/grammar/grammar.service';
import * as junkService from '../src/modules/junk/junk.service';
import * as readingService from '../src/modules/reading/reading.service';
import * as writingService from '../src/modules/writing/writing.service';
import { writingAnalysis } from './fixtures/writing';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';

const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));

describe.skipIf(!hasTestDatabaseUrl)('Domain modules PostgreSQL integration', () => {
  let database: DatabaseClient | undefined;

  const getDatabase = (): DatabaseClient => {
    if (database === undefined) {
      throw new Error('Test database client is not initialized.');
    }

    return database;
  };

  beforeAll(() => {
    database = createTestDatabaseClient();
    configureDatabaseClient(database);
  });

  beforeEach(async () => {
    const databaseClient = getDatabase();
    await resetTestDatabase(databaseClient);
    await migrateDatabase(databaseClient, await loadMigrations(migrationDirectory));
  });

  afterAll(async () => {
    if (database !== undefined) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('persists, aggregates, updates, and soft deletes finance transactions', async () => {
    const firstBatch = await financeService.createTransactions({
      date: '2026-09-05',
      type: 'expense',
      rawText: '12, breakfast\n23, taxi',
      transactions: [
        {
          amount: 12_000,
          categoryCode: 'food_drink',
          name: 'Breakfast',
          location: null,
          note: null,
        },
        {
          amount: 23_000,
          categoryCode: 'transport',
          name: 'Taxi',
          location: null,
          note: null,
        },
      ],
    });
    const secondBatch = await financeService.createTransactions({
      date: '2026-09-05',
      type: 'income',
      rawText: '50, refund',
      transactions: [
        {
          amount: 50_000,
          categoryCode: 'refund',
          name: 'Refund',
          location: null,
          note: null,
        },
      ],
    });

    expect(firstBatch.map(({ dailyNumber }) => dailyNumber)).toEqual([1, 2]);
    expect(secondBatch[0]?.dailyNumber).toBe(3);

    const summary = await financeService.getSummary({ from: '2026-09-05', to: '2026-09-05', mode: 'net' });
    expect(summary).toMatchObject({ expenseTotal: 35_000, incomeTotal: 50_000, netTotal: 15_000 });

    const updated = await financeService.updateTransaction(
      { date: '2026-09-05', dailyNumber: 2 },
      { amount: 25_000, note: 'Airport trip' },
    );
    expect(updated).toMatchObject({ amount: 25_000, note: 'Airport trip' });

    await financeService.removeTransaction({ date: '2026-09-05', dailyNumber: 1 });
    const remaining = await financeService.listTransactions({ date: '2026-09-05' });
    expect(remaining.map(({ dailyNumber, displayNumber }) => ({ dailyNumber, displayNumber }))).toEqual([
      { dailyNumber: 2, displayNumber: 1 },
      { dailyNumber: 3, displayNumber: 2 },
    ]);
  });

  test('persists, searches, updates, and soft deletes junk items', async () => {
    const first = await junkService.create({
      title: 'Rust article',
      category: 'article',
      rawText: 'Useful Rust article',
      contentText: 'An article about Rust ownership.',
      sourceUrl: 'https://example.com/rust',
      tags: ['rust', 'programming'],
    });
    const second = await junkService.create({
      title: null,
      category: 'quote',
      rawText: 'A useful quote',
      contentText: 'A quote about deliberate practice.',
      sourceUrl: null,
      tags: ['learning'],
    });

    expect(first.code).toMatch(/^JK-\d{8}-001$/);
    expect(second.code).toMatch(/^JK-\d{8}-002$/);
    expect((await junkService.list({ q: 'ownership', limit: 20 })).map(({ code }) => code)).toEqual([first.code]);

    const updated = await junkService.update(
      { code: first.code },
      { category: 'reference', tags: ['rust', 'backend'] },
    );
    expect(updated).toMatchObject({ category: 'reference', tags: ['rust', 'backend'] });

    await junkService.remove({ code: first.code });
    await expect(junkService.getDetail({ code: first.code })).rejects.toMatchObject({ code: 'JUNK_ITEM_NOT_FOUND' });
  });

  test('persists practice and completes an evaluated grammar exam', async () => {
    const practice = await grammarService.createSession({
      mode: 'practice',
      source: 'request',
      level: 'A1',
      questions: [
        {
          questionType: 'fill_blank',
          grammarArea: 'tenses',
          grammarPoint: 'simple past',
          level: 'A1',
          questionText: 'She ___ yesterday.',
          correctAnswer: 'went',
          explanation: 'Use the simple past for completed actions.',
        },
      ],
    });
    const answeredPractice = await grammarService.saveAnswer(practice.code, 1, {
      userAnswer: 'went',
      result: 'correct',
      feedback: null,
    });
    expect(answeredPractice.questions[0]?.answer?.result).toBe('correct');
    expect((await grammarService.getExplanation(practice.code, 1)).explanation).toContain('simple past');

    const exam = await grammarService.createSession({
      mode: 'exam',
      source: 'request',
      level: 'A1',
      questions: [
        {
          questionType: 'fill_blank',
          grammarArea: 'tenses',
          grammarPoint: 'simple past',
          level: 'A1',
          questionText: 'She ___ yesterday.',
          correctAnswer: 'went',
          explanation: 'Use the simple past.',
        },
        {
          questionType: 'error_correction',
          grammarArea: 'agreement',
          grammarPoint: 'subject verb agreement',
          level: 'A1',
          questionText: 'He walk every day.',
          correctAnswer: 'He walks every day.',
          explanation: 'Third-person singular verbs take -s.',
        },
      ],
    });
    await grammarService.saveAnswer(exam.code, 1, { userAnswer: 'went' });
    await grammarService.saveAnswer(exam.code, 2, { userAnswer: 'He walk every day.' });
    const report = await grammarService.evaluateSession(exam.code, {
      answers: [
        { questionNumber: 1, result: 'correct', feedback: null },
        { questionNumber: 2, result: 'incorrect', feedback: 'Use walks.' },
      ],
    });

    expect(report).toMatchObject({ status: 'completed', score: 1, maxScore: 2 });
    expect(report.breakdown).toHaveLength(2);

    await grammarService.removeSession(practice.code);
    await expect(grammarService.getSession(practice.code)).rejects.toMatchObject({ code: 'GRAMMAR_SESSION_NOT_FOUND' });
  });

  test('persists one complete reading submission and protects expected answers', async () => {
    const material = await readingService.createMaterial({
      topic: 'Morning market',
      level: 'A1',
      genre: 'story',
      tags: ['daily-life'],
      targetWordCount: 300,
      passageText: 'Mira visits the market early every Sunday morning.',
      source: 'request',
      questions: [
        { questionText: 'Who visits the market?', expectedAnswer: 'Mira.' },
        { questionText: 'When does Mira visit?', expectedAnswer: 'Every Sunday morning.' },
        { questionText: 'Where does Mira go?', expectedAnswer: 'The market.' },
      ],
    });

    expect(material.code).toMatch(/^RD-\d{8}-001$/);
    expect(material.wordCount).toBe(8);
    expect(material.questions.every(({ userAnswer }) => userAnswer === null)).toBe(true);

    const expectedAnswers = await readingService.getExpectedAnswers(material.code);
    expect(expectedAnswers.map(({ expectedAnswer }) => expectedAnswer)).toEqual([
      'Mira.',
      'Every Sunday morning.',
      'The market.',
    ]);

    const submitted = await readingService.saveSubmission(material.code, {
      answers: [
        { questionNumber: 1, userAnswer: 'Mira.' },
        { questionNumber: 2, userAnswer: 'Sunday morning.' },
        { questionNumber: 3, userAnswer: 'The market.' },
      ],
    });
    expect(submitted.questions.map(({ userAnswer }) => userAnswer)).toEqual([
      'Mira.',
      'Sunday morning.',
      'The market.',
    ]);

    await expect(
      readingService.saveSubmission(material.code, {
        answers: [
          { questionNumber: 1, userAnswer: 'Mira.' },
          { questionNumber: 2, userAnswer: 'Sunday morning.' },
          { questionNumber: 3, userAnswer: 'The market.' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'READING_SUBMISSION_ALREADY_EXISTS', statusCode: 409 });
  });

  test('persists structured writing feedback and serializes concurrent draft numbers', async () => {
    const material = await writingService.createMaterial({
      topic: 'My work week',
      promptText: 'Describe your work experience this week.',
      level: 'A1',
      genre: 'journal',
      tags: ['work', 'reflection'],
      targetWordCount: 150,
      source: 'request',
    });

    expect(material.code).toMatch(/^WR-\d{8}-001$/);

    const createDraft = (originalText: string) =>
      writingService.createSubmission(material.code, {
        originalText,
        estimatedLevel: 'A1',
        analysis: writingAnalysis,
      });
    const drafts = await Promise.all([
      createDraft('I went to the office yesterday.'),
      createDraft('Yesterday I worked from the office.'),
    ]);

    expect(drafts.map(({ submissionNumber }) => submissionNumber).sort()).toEqual([1, 2]);
    expect(drafts.map(({ wordCount }) => wordCount)).toEqual([6, 6]);

    const firstDraft = await writingService.getSubmission(material.code, 1);
    expect(firstDraft.analysis).toEqual(writingAnalysis);
    expect(await writingService.getCorrectedText(material.code, 1)).toEqual({
      submissionNumber: 1,
      correctedText: writingAnalysis.correctedText,
    });
  });
});
