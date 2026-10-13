import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import {
  commitTransaction,
  configureDatabaseClient,
  rollbackTransaction,
  startTransaction,
} from '../src/core/database/client';
import { loadMigrations, migrateDatabase } from '../src/core/database/migration-runner';
import * as financeService from '../src/modules/finance/finance.service';
import * as grammarRepository from '../src/modules/grammar/grammar.repository';
import * as grammarService from '../src/modules/grammar/grammar.service';
import * as junkService from '../src/modules/junk/junk.service';
import * as readingService from '../src/modules/reading/reading.service';
import * as writingMaterialService from '../src/modules/writing/writing-material/writing-material.service';
import * as writingSubmissionService from '../src/modules/writing/writing-submission/writing-submission.service';
import { writingAnalysis } from './fixtures/writing';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient, DatabaseReservedConnection } from '../src/core/database/database.types';

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
      raw_text: '12, breakfast\n23, taxi',
      transactions: [
        {
          amount: 12_000,
          category_code: 'food_drink',
          name: 'Breakfast',
          location: null,
          note: null,
        },
        {
          amount: 23_000,
          category_code: 'transport',
          name: 'Taxi',
          location: null,
          note: null,
        },
      ],
    });
    const secondBatch = await financeService.createTransactions({
      date: '2026-09-05',
      type: 'income',
      raw_text: '50, refund',
      transactions: [
        {
          amount: 50_000,
          category_code: 'refund',
          name: 'Refund',
          location: null,
          note: null,
        },
      ],
    });

    expect(firstBatch.map(({ daily_number }) => daily_number)).toEqual([1, 2]);
    expect(secondBatch[0]?.daily_number).toBe(3);

    const summary = await financeService.getSummary({ from: '2026-09-05', to: '2026-09-05', mode: 'net' });
    expect(summary).toMatchObject({ expense_total: 35_000, income_total: 50_000, net_total: 15_000 });

    const dailySummary = await financeService.getDailySummary({ from: '2026-09-05', to: '2026-09-06' });
    expect(dailySummary).toEqual([
      {
        date: '2026-09-05',
        expense_total: 35_000,
        income_total: 50_000,
        net_total: 15_000,
      },
    ]);

    const updated = await financeService.updateTransaction(
      { date: '2026-09-05', daily_number: 2 },
      { amount: 25_000, note: 'Airport trip' },
    );
    expect(updated).toMatchObject({ amount: 25_000, note: 'Airport trip' });

    await financeService.removeTransaction({ date: '2026-09-05', daily_number: 1 });
    const remaining = await financeService.listTransactions({ date: '2026-09-05' });
    expect(remaining.map(({ daily_number, display_number }) => ({ daily_number, display_number }))).toEqual([
      { daily_number: 2, display_number: 1 },
      { daily_number: 3, display_number: 2 },
    ]);

    await expect(financeService.getDailySummary({ from: '2026-09-05', to: '2026-09-05' })).resolves.toEqual([
      {
        date: '2026-09-05',
        expense_total: 25_000,
        income_total: 50_000,
        net_total: 25_000,
      },
    ]);
    await expect(financeService.getDailySummary({ from: '2026-09-06', to: '2026-09-06' })).resolves.toEqual([]);
  });

  test('persists, searches, updates, and soft deletes junk items', async () => {
    const first = await junkService.create({
      title: 'Rust article',
      category: 'article',
      raw_text: 'Useful Rust article',
      content_text: 'An article about Rust ownership.',
      source_url: 'https://example.com/rust',
      source_name: 'Rust journal',
      tags: ['rust', 'programming'],
    });
    const second = await junkService.create({
      title: null,
      category: 'quote',
      raw_text: 'A useful quote',
      content_text: 'A quote about deliberate practice.',
      source_url: null,
      source_name: null,
      tags: ['learning'],
    });

    expect(first.code).toMatch(/^JK-\d{8}-001$/);
    expect(second.code).toMatch(/^JK-\d{8}-002$/);
    expect((await junkService.list({ q: 'ownership', sort: 'newest', limit: 20 })).map(({ code }) => code)).toEqual([
      first.code,
    ]);

    const updated = await junkService.update(
      { code: first.code },
      { category: 'reference', tags: ['rust', 'backend'] },
    );
    expect(updated).toMatchObject({ category: 'Reference', tags: ['Rust', 'Backend'], source_name: 'Rust journal' });
    expect((await junkService.update({ code: first.code }, { source_name: 'New name' })).source_name).toBe('New name');
    expect((await junkService.update({ code: first.code }, { source_name: null })).source_name).toBeNull();

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
          question_type: 'fill_blank',
          grammar_area: 'tenses',
          grammar_point: 'simple past',
          level: 'A1',
          question_text: 'She ___ yesterday.',
          correct_answer: 'went',
          explanation: 'Use the simple past for completed actions.',
        },
        {
          question_type: 'error_correction',
          grammar_area: 'agreement',
          grammar_point: 'subject verb agreement',
          level: 'A1',
          question_text: 'He walk every day.',
          correct_answer: 'He walks every day.',
          explanation: 'Third-person singular verbs take -s.',
        },
      ],
    });
    expect(practice.questions.map(({ question_number }) => question_number)).toEqual([1, 2]);
    const firstPracticeAnswer = await grammarService.saveAnswers(practice.code, {
      answers: [{ question_number: 1, user_answer: 'went', result: 'correct', feedback: null }],
    });
    expect(firstPracticeAnswer.status).toBe('active');
    expect(firstPracticeAnswer.questions[0]?.answer?.result).toBe('correct');
    expect((await grammarService.getExplanation(practice.code, 1)).explanation).toContain('simple past');

    const completedPractice = await grammarService.saveAnswers(practice.code, {
      answers: [{ question_number: 2, user_answer: 'He walk every day.', result: 'incorrect', feedback: 'Use walks.' }],
    });
    expect(completedPractice.status).toBe('completed');
    expect(completedPractice.score).toBe(1);
    expect(completedPractice.max_score).toBe(2);
    expect(completedPractice.completed_at).not.toBeNull();

    const exam = await grammarService.createSession({
      mode: 'exam',
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
        {
          question_type: 'error_correction',
          grammar_area: 'agreement',
          grammar_point: 'subject verb agreement',
          level: 'A1',
          question_text: 'He walk every day.',
          correct_answer: 'He walks every day.',
          explanation: 'Third-person singular verbs take -s.',
        },
      ],
    });
    await grammarService.saveAnswers(exam.code, { answers: [{ question_number: 1, user_answer: 'went' }] });
    await grammarService.saveAnswers(exam.code, {
      answers: [{ question_number: 2, user_answer: 'He walk every day.' }],
    });
    const report = await grammarService.evaluateSession(exam.code, {
      answers: [
        { question_number: 1, result: 'correct', feedback: null },
        { question_number: 2, result: 'incorrect', feedback: 'Use walks.' },
      ],
    });

    expect(report).toMatchObject({ status: 'completed', score: 1, max_score: 2 });
    expect(report.breakdown).toHaveLength(2);

    const completedSessions = await grammarService.listSessions({
      q: exam.code,
      status: 'completed',
      mode: 'exam',
      level: 'A1',
      limit: 20,
      sort: 'newest',
    });
    expect(completedSessions).toMatchObject({
      items: [
        {
          code: exam.code,
          mode: 'exam',
          source: 'request',
          status: 'completed',
          level: 'A1',
          question_count: 2,
          score: 1,
          max_score: 2,
        },
      ],
    });

    await grammarService.removeSession(practice.code);
    await expect(grammarService.getSession(practice.code)).rejects.toMatchObject({ code: 'GRAMMAR_SESSION_NOT_FOUND' });
  });

  test('locks a grammar session before deciding whether it is still active', async () => {
    const exam = await grammarService.createSession({
      mode: 'exam',
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
    let firstTrx: DatabaseReservedConnection | undefined = await startTransaction();
    let secondTrx: DatabaseReservedConnection | undefined = await startTransaction();

    try {
      const initialSession = await grammarRepository.getOneByCodeForUpdate(exam.code, firstTrx);
      expect(initialSession?.status).toBe('active');

      await grammarRepository.updateOneCompletionByCode(exam.code, 1, 1, firstTrx);
      const waitingSession = grammarRepository.getOneByCodeForUpdate(exam.code, secondTrx);

      const trxToCommit = firstTrx;
      firstTrx = undefined;
      await commitTransaction(trxToCommit);

      const lockedSession = await waitingSession;
      expect(lockedSession?.status).toBe('completed');
    } finally {
      if (firstTrx !== undefined) {
        await rollbackTransaction(firstTrx);
      }

      if (secondTrx !== undefined) {
        const trxToRollback = secondTrx;
        secondTrx = undefined;
        await rollbackTransaction(trxToRollback);
      }
    }
  });

  test('persists editable reading answers without changing manual read status', async () => {
    const material = await readingService.createMaterial({
      title: 'Morning market',
      level: 'A1',
      genre: 'story',
      tags: ['daily-life'],
      target_word_count: 300,
      content_text: 'Mira visits the market early every Sunday morning.',
      source: 'request',
      questions: [
        { question_text: 'Who visits the market?', expected_answer: 'Mira.' },
        { question_text: 'When does Mira visit?', expected_answer: 'Every Sunday morning.' },
        { question_text: 'Where does Mira go?', expected_answer: 'The market.' },
      ],
    });

    expect(material.code).toMatch(/^RD-\d{8}-001$/);
    expect(material.word_count).toBe(8);
    expect(material.questions.map(({ question_number }) => question_number)).toEqual([1, 2, 3]);
    expect(material.questions.every(({ user_answer }) => user_answer === null)).toBe(true);

    const expectedAnswers = await readingService.getExpectedAnswers(material.code);
    expect(expectedAnswers.map(({ expected_answer }) => expected_answer)).toEqual([
      'Mira.',
      'Every Sunday morning.',
      'The market.',
    ]);

    const submitted = await readingService.saveAnswers(material.code, {
      answers: [
        { question_number: 1, user_answer: 'Mira.' },
        { question_number: 2, user_answer: 'Sunday morning.' },
        { question_number: 3, user_answer: 'The market.' },
      ],
    });
    expect(submitted.questions.map(({ user_answer }) => user_answer)).toEqual([
      'Mira.',
      'Sunday morning.',
      'The market.',
    ]);

    await expect(
      readingService.listMaterials({
        q: 'MARKET',
        reading_status: 'unread',
        limit: 20,
        sort: 'newest',
      }),
    ).resolves.toMatchObject({
      items: [{ code: material.code, reading_status: 'unread' }],
    });

    await expect(
      readingService.saveAnswers(material.code, {
        answers: [
          { question_number: 1, user_answer: 'Mira.' },
          { question_number: 2, user_answer: 'Sunday morning.' },
          { question_number: 3, user_answer: 'The market.' },
        ],
      }),
    ).resolves.toMatchObject({ code: material.code, reading_status: 'unread' });

    await getDatabase()`
      UPDATE reading_submissions
      SET deleted_at = NOW()
      WHERE material_id = (SELECT id FROM reading_materials WHERE code = ${material.code})
    `;

    const resubmitted = await readingService.saveAnswers(material.code, {
      answers: [
        { question_number: 1, user_answer: 'Mira.' },
        { question_number: 2, user_answer: 'Sunday morning.' },
        { question_number: 3, user_answer: 'The market.' },
      ],
    });
    expect(resubmitted.questions.map(({ user_answer }) => user_answer)).toEqual([
      'Mira.',
      'Sunday morning.',
      'The market.',
    ]);
  });

  test('saves independent submissions and persists structured writing feedback', async () => {
    const material = await writingMaterialService.createMaterial({
      topic: 'My work week',
      prompt_text: 'Describe your work experience this week.',
      level: 'A1',
      genre: 'journal',
      tags: ['work', 'reflection'],
      target_word_count: 150,
      source: 'request',
    });

    expect(material.code).toMatch(/^WR-\d{8}-001$/);

    const createDraft = (original_text: string) =>
      writingSubmissionService.createSubmission({ material_code: material.code, original_text });
    const drafts = await Promise.all([
      createDraft('I went to the office yesterday.'),
      createDraft('Yesterday I worked from the office.'),
    ]);

    expect(drafts.map(({ code }) => code.split('-')[2]).sort()).toEqual(['001', '002']);
    expect(drafts.map(({ word_count }) => word_count)).toEqual([6, 6]);

    const draft = drafts[0];

    if (draft === undefined) {
      throw new Error('Expected a saved writing submission.');
    }

    const firstDraft = await writingSubmissionService.saveAnalysis(draft.code, {
      estimated_topic: 'Work',
      estimated_genre: 'journal',
      estimated_tags: ['work'],
      estimated_level: 'A1',
      analysis: writingAnalysis,
    });
    expect(firstDraft.analysis).toEqual(writingAnalysis);
    expect(await writingSubmissionService.getCorrectedText(firstDraft.code)).toEqual({
      code: firstDraft.code,
      corrected_text: writingAnalysis.corrected_text,
    });
    await expect(
      writingMaterialService.listMaterials({
        q: 'WORK',
        status: 'reviewed',
        page: 1,
        limit: 20,
        sort: 'newest',
      }),
    ).resolves.toMatchObject({
      items: [
        {
          code: material.code,
          status: 'reviewed',
          submission_count: 2,
          analyzed_submission_count: 1,
          unanalyzed_submission_count: 1,
        },
      ],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    });
  });

  test('preserves free-writing metadata, text locks, and literal collection search', async () => {
    const original_text = '  I improved 10%_\\ today.\n';
    const free = await writingSubmissionService.createSubmission({ original_text });

    expect(free).toMatchObject({
      original_text,
      material_code: null,
      analysis: null,
      analyzed_at: null,
      estimated_topic: null,
      estimated_genre: null,
      estimated_tags: null,
      estimated_level: null,
    });
    expect(await writingSubmissionService.getSubmission(free.code)).toEqual(free);

    const draft = await writingSubmissionService.updateSubmission(free.code, {
      original_text: '  My sports journal improved 10%_\\ today.\n',
      estimated_topic: 'Sports',
      estimated_tags: [],
    });

    expect(draft.original_text).toBe('  My sports journal improved 10%_\\ today.\n');
    expect(draft.word_count).toBe(6);
    expect(draft.analysis_status).toBe('not_analyzed');

    const analysisInput = {
      estimated_topic: 'AI topic',
      estimated_genre: 'journal',
      estimated_tags: ['AI tag'],
      estimated_level: 'B1' as const,
      analysis: { ...writingAnalysis, prompt_adherence: null },
    };
    const analyzed = await writingSubmissionService.saveAnalysis(free.code, analysisInput);

    expect(analyzed).toMatchObject({
      estimated_topic: 'Sports',
      estimated_genre: 'Journal',
      estimated_tags: [],
      estimated_level: 'B1',
      analysis_status: 'analyzed',
      analysis: analysisInput.analysis,
    });
    expect(analyzed.analyzed_at).not.toBeNull();

    await expect(
      writingSubmissionService.updateSubmission(free.code, {
        original_text: draft.original_text,
        estimated_topic: 'Blocked',
      }),
    ).rejects.toMatchObject({ code: 'WRITING_SUBMISSION_TEXT_LOCKED' });
    await expect(writingSubmissionService.saveAnalysis(free.code, analysisInput)).rejects.toMatchObject({
      code: 'WRITING_SUBMISSION_ALREADY_ANALYZED',
    });

    const corrected = await writingSubmissionService.updateSubmission(free.code, {
      estimated_topic: 'User correction',
      estimated_level: 'B2',
    });

    expect(corrected.analysis).toEqual(analyzed.analysis);
    expect(corrected.analyzed_at).toBe(analyzed.analyzed_at);
    expect(corrected.original_text).toBe(draft.original_text);

    await writingSubmissionService.createSubmission({ original_text: 'I improved 10ab today.' });

    const results = await writingSubmissionService.listSubmissions({
      q: '10%_\\',
      writing_type: 'free',
      analysis_status: 'analyzed',
      page: 1,
      limit: 20,
      sort: 'newest',
    });

    expect(results.items).toHaveLength(1);
    expect(results.items[0]?.code).toBe(free.code);
    expect(results.items[0]).not.toHaveProperty('analysis');
    expect(results.items[0]).not.toHaveProperty('original_text');
    expect(results.meta.total).toBe(1);
  });

  test('derives material statuses and hides deleted submissions and parents', async () => {
    const material = await writingMaterialService.createMaterial({
      topic: 'Sports',
      prompt_text: 'Describe your exercise routine.',
      level: 'A1',
      genre: 'journal',
      tags: ['exercise'],
      target_word_count: 150,
      source: 'cron',
    });
    const query = { page: 1, limit: 20, sort: 'newest' as const };

    expect((await writingMaterialService.listMaterials({ ...query, status: 'unsubmitted' })).meta.total).toBe(1);

    const prompted = await writingSubmissionService.createSubmission({
      material_code: material.code,
      original_text: 'I run every day.',
    });
    const free = await writingSubmissionService.createSubmission({ original_text: 'I write without a prompt.' });

    expect((await writingMaterialService.listMaterials({ ...query, status: 'submitted' })).items[0]).toMatchObject({
      status: 'submitted',
      submission_count: 1,
      analyzed_submission_count: 0,
      unanalyzed_submission_count: 1,
      latest_submission_code: prompted.code,
    });
    expect((await writingMaterialService.listMaterials({ ...query, status: 'reviewed' })).meta.total).toBe(0);

    const databaseClient = getDatabase();

    await databaseClient`UPDATE writing_materials SET deleted_at = NOW() WHERE code = ${material.code}`;

    await expect(writingSubmissionService.getSubmission(prompted.code)).rejects.toMatchObject({
      code: 'WRITING_SUBMISSION_NOT_FOUND',
    });
    expect((await writingSubmissionService.listSubmissions(query)).items.map(({ code }) => code)).toEqual([free.code]);
    expect((await writingSubmissionService.listSubmissions(query)).meta.total).toBe(1);

    await databaseClient`UPDATE writing_submissions SET deleted_at = NOW() WHERE code = ${free.code}`;

    expect((await writingSubmissionService.listSubmissions(query)).meta.total).toBe(0);
    await expect(writingSubmissionService.getSubmission(free.code)).rejects.toMatchObject({
      code: 'WRITING_SUBMISSION_NOT_FOUND',
    });

    const next = await writingSubmissionService.createSubmission({ original_text: 'Another free draft.' });

    expect(next.code.split('-')[2]).toBe('003');
  });
});
