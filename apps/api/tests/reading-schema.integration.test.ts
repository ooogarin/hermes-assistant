import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { configureDatabaseClient } from '../src/core/database/client';
import {
  getMigrationStatus,
  loadMigrations,
  migrateDatabase,
  rollbackLatestMigration,
} from '../src/core/database/migration-runner';
import * as readingRepository from '../src/modules/reading/reading.repository';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';
import type { CreateReadingMaterialPayload } from '../src/modules/reading/reading.types';

const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));
const readingMigrationName = '0010_align_reading_schema.ts';

type MaterialContentRow = {
  id: number;
  code: string;
  title: string;
  content_text: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};
type MaterialSnapshotRow = { code: string; target_question_count: number; reading_status: string };
type SettingsSnapshotRow = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  default_question_count: number;
};
type SavedAnswerRow = { question_number: number; expected_answer: string; user_answer: string };
type ReadingStatusRow = { reading_status: string };
type QuestionSummaryRow = { code: string; question_count: number; submission_count: number };
type UserAnswerRow = { user_answer: string };
type StoredMaterialRow = { title: string; content_text: string; target_question_count: number; reading_status: string };
type LegacyContentRow = { code: string; topic: string; passage_text: string };
type CountRow = { count: number };
type ColumnRow = { column_name: string };

const seedLegacyData = async (database: DatabaseClient): Promise<void> => {
  await resetTestDatabase(database);
  const migrations = await loadMigrations(migrationDirectory);
  await migrateDatabase(
    database,
    migrations.filter(({ name }) => name < readingMigrationName),
  );
  await database`
    UPDATE reading_settings
    SET default_level = 'B1', default_word_count = 450, min_word_count = 400, max_word_count = 500
  `;
  await database`
    INSERT INTO reading_materials (
      code, topic, level, genre, tags, target_word_count, word_count,
      passage_text, is_override, source, deleted_at
    )
    VALUES
      ('RD-20261001-001', 'Existing article', 'B1', 'article', ARRAY['work'], 450, 3,
        'Original article content.', TRUE, 'request', NULL),
      ('RD-20261001-002', 'Deleted story', 'A1', 'story', ARRAY['city'], 300, 3,
        'Original story content.', FALSE, 'cron', NOW()),
      ('RD-20261001-003', 'Article without questions', 'B1', 'article', '{}', 450, 3,
        'Only reading content.', FALSE, 'request', NULL)
  `;
  await database`
    INSERT INTO reading_questions (material_id, question_number, question_text, expected_answer, deleted_at)
    SELECT
      m.id,
      n,
      'Question ' || n,
      'Reference ' || n,
      CASE WHEN m.code = 'RD-20261001-001' AND n = 3 THEN NOW() END
    FROM reading_materials m
    CROSS JOIN GENERATE_SERIES(1, CASE WHEN m.code = 'RD-20261001-001' THEN 3 ELSE 5 END) n
    WHERE m.code IN ('RD-20261001-001', 'RD-20261001-002')
  `;
  await database`
    INSERT INTO reading_submissions (material_id)
    SELECT id FROM reading_materials WHERE code = 'RD-20261001-001'
  `;
  await database`
    INSERT INTO reading_answers (submission_id, question_id, user_answer)
    SELECT s.id, q.id, 'Existing user answer'
    FROM reading_submissions s
    JOIN reading_questions q ON q.material_id = s.material_id
    WHERE q.question_number = 1
  `;
};

describe.skipIf(!hasTestDatabaseUrl)('Reading schema PostgreSQL integration', () => {
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

  test('preserves legacy content, answers, and historical question counts without inferring read status', async () => {
    const databaseClient = getDatabase();
    await seedLegacyData(databaseClient);
    const before = await databaseClient<MaterialContentRow[]>`
      SELECT id, code, topic AS title, passage_text AS content_text, tags, created_at, updated_at, deleted_at
      FROM reading_materials
      ORDER BY code
    `;
    const migrations = await loadMigrations(migrationDirectory);

    expect(await migrateDatabase(databaseClient, migrations)).toEqual([readingMigrationName]);
    expect(await migrateDatabase(databaseClient, migrations)).toEqual([]);
    expect(await getMigrationStatus(databaseClient, migrations)).toContainEqual({
      name: readingMigrationName,
      status: 'applied',
    });
    expect(
      await databaseClient<MaterialContentRow[]>`
        SELECT id, code, title, content_text, tags, created_at, updated_at, deleted_at
        FROM reading_materials
        ORDER BY code
      `,
    ).toEqual(before);
    expect(
      await databaseClient<MaterialSnapshotRow[]>`
        SELECT code, target_question_count, reading_status
        FROM reading_materials
        ORDER BY code
      `,
    ).toEqual([
      { code: 'RD-20261001-001', target_question_count: 3, reading_status: 'unread' },
      { code: 'RD-20261001-002', target_question_count: 5, reading_status: 'unread' },
      { code: 'RD-20261001-003', target_question_count: 0, reading_status: 'unread' },
    ]);
    expect(
      await databaseClient<SettingsSnapshotRow[]>`
        SELECT default_level, default_word_count, min_word_count, max_word_count, default_question_count
        FROM reading_settings
      `,
    ).toEqual([
      {
        default_level: 'B1',
        default_word_count: 450,
        min_word_count: 400,
        max_word_count: 500,
        default_question_count: 3,
      },
    ]);
    expect(
      await databaseClient<SavedAnswerRow[]>`
        SELECT q.question_number, q.expected_answer, a.user_answer
        FROM reading_answers a
        JOIN reading_questions q ON q.id = a.question_id
        JOIN reading_submissions s ON s.id = a.submission_id AND s.material_id = q.material_id
      `,
    ).toEqual([{ question_number: 1, expected_answer: 'Reference 1', user_answer: 'Existing user answer' }]);
  });

  test('stores optional questions and partial answers independently from manual read status', async () => {
    const databaseClient = getDatabase();
    await databaseClient`
      INSERT INTO reading_materials (
        code, title, level, genre, target_word_count, target_question_count, word_count, content_text, is_override, source
      )
      VALUES
        ('RD-20261001-001', 'Just reading', 'A1', 'article', 300, 0, 2, 'Reading only.', FALSE, 'request'),
        ('RD-20261001-002', 'Optional practice', 'A1', 'article', 300, 3, 2, 'Optional practice.', FALSE, 'request')
    `;
    await databaseClient`
      INSERT INTO reading_questions (material_id, question_number, question_text, expected_answer)
      SELECT m.id, n, 'Question ' || n, 'Reference ' || n
      FROM reading_materials m
      CROSS JOIN GENERATE_SERIES(1, 3) n
      WHERE m.code = 'RD-20261001-002'
    `;
    await databaseClient`
      INSERT INTO reading_submissions (material_id)
      SELECT id FROM reading_materials WHERE code = 'RD-20261001-002'
    `;
    await databaseClient`
      INSERT INTO reading_answers (submission_id, question_id, user_answer)
      SELECT s.id, q.id, 'One optional answer'
      FROM reading_submissions s
      JOIN reading_questions q ON q.material_id = s.material_id
      WHERE q.question_number = 1
    `;
    expect(
      await databaseClient<ReadingStatusRow[]>`SELECT reading_status FROM reading_materials ORDER BY code`,
    ).toEqual([{ reading_status: 'unread' }, { reading_status: 'unread' }]);

    await databaseClient`UPDATE reading_materials SET reading_status = 'read'`;
    expect(
      await databaseClient<ReadingStatusRow[]>`SELECT reading_status FROM reading_materials ORDER BY code`,
    ).toEqual([{ reading_status: 'read' }, { reading_status: 'read' }]);
    expect(
      await databaseClient<QuestionSummaryRow[]>`
        SELECT
          m.code,
          (SELECT COUNT(*)::INTEGER FROM reading_questions q WHERE q.material_id = m.id) AS question_count,
          (SELECT COUNT(*)::INTEGER FROM reading_submissions s WHERE s.material_id = m.id) AS submission_count
        FROM reading_materials m
        ORDER BY m.code
      `,
    ).toEqual([
      { code: 'RD-20261001-001', question_count: 0, submission_count: 0 },
      { code: 'RD-20261001-002', question_count: 3, submission_count: 1 },
    ]);
    expect(await databaseClient<UserAnswerRow[]>`SELECT user_answer FROM reading_answers`).toEqual([
      { user_answer: 'One optional answer' },
    ]);
    await databaseClient`UPDATE reading_materials SET reading_status = 'unread'`;
    expect(
      await databaseClient<ReadingStatusRow[]>`SELECT reading_status FROM reading_materials ORDER BY code`,
    ).toEqual([{ reading_status: 'unread' }, { reading_status: 'unread' }]);
  });

  test('enforces question-count bounds and allowed reading statuses on every database write', async () => {
    const databaseClient = getDatabase();
    for (const count of [0, 20]) {
      await databaseClient`UPDATE reading_settings SET default_question_count = ${count}`;
    }
    for (const count of [-1, 21]) {
      await expect(
        Promise.resolve(databaseClient`UPDATE reading_settings SET default_question_count = ${count}`),
      ).rejects.toMatchObject({ errno: '23514' });
    }
    await databaseClient`
      INSERT INTO reading_materials (
        code, title, level, genre, target_word_count, target_question_count, word_count, content_text, is_override, source
      )
      VALUES ('RD-20261001-001', 'Bounds', 'A1', 'article', 300, 0, 1, 'Content.', FALSE, 'request')
    `;
    await databaseClient`UPDATE reading_materials SET target_question_count = 20`;
    for (const count of [-1, 21]) {
      await expect(
        Promise.resolve(databaseClient`UPDATE reading_materials SET target_question_count = ${count}`),
      ).rejects.toMatchObject({ errno: '23514' });
    }
    await expect(
      Promise.resolve(databaseClient`UPDATE reading_materials SET target_question_count = NULL`),
    ).rejects.toMatchObject({
      errno: '23502',
    });
    await expect(
      Promise.resolve(databaseClient`UPDATE reading_materials SET reading_status = 'completed'`),
    ).rejects.toMatchObject({
      errno: '23514',
    });
    await expect(
      Promise.resolve(databaseClient`UPDATE reading_materials SET reading_status = NULL`),
    ).rejects.toMatchObject({
      errno: '23502',
    });
  });

  test('uses the new Reading field names for inserts, detail, list, and search', async () => {
    const code = 'RD-20261001-001';
    const input: CreateReadingMaterialPayload = {
      title: 'Morning market',
      level: 'A1',
      genre: 'story',
      tags: ['daily-life'],
      target_word_count: 300,
      content_text: 'Mira visits the market early every Sunday morning.',
      source: 'request',
      questions: Array.from({ length: 5 }, (_, index) => ({
        question_number: index + 1,
        question_text: `Question ${index + 1}`,
        expected_answer: `Reference ${index + 1}`,
      })),
    };
    const trx = await getDatabase().reserve();
    try {
      await trx`BEGIN`;
      const material = await readingRepository.insertMaterial(trx, code, input, 9, false);
      await readingRepository.insertQuestions(trx, material.id, input.questions);
      expect(await readingRepository.findByCodeInTransaction(trx, code)).toMatchObject({
        title: input.title,
        content_text: input.content_text,
      });
      await trx`COMMIT`;
    } catch (error) {
      await trx`ROLLBACK`;
      throw error;
    } finally {
      trx.release();
    }
    expect(await readingRepository.findByCode(code)).toMatchObject({
      title: input.title,
      content_text: input.content_text,
    });
    const query = { page: 1, limit: 100, sort: 'newest' as const, q: input.title };
    expect((await readingRepository.listMaterials(query)).map(({ code, title }) => ({ code, title }))).toEqual([
      { code, title: input.title },
    ]);
    expect(await readingRepository.countMaterials(query)).toEqual({ total: 1 });
    expect(
      await getDatabase()<StoredMaterialRow[]>`
        SELECT title, content_text, target_question_count, reading_status
        FROM reading_materials
        WHERE code = ${code}
      `,
    ).toEqual([
      {
        title: input.title,
        content_text: input.content_text,
        target_question_count: 5,
        reading_status: 'unread',
      },
    ]);
  });

  test('rolls back the schema rename without removing material, question, or answer rows', async () => {
    const databaseClient = getDatabase();
    await seedLegacyData(databaseClient);
    const migrations = await loadMigrations(migrationDirectory);
    await migrateDatabase(databaseClient, migrations);
    await databaseClient`UPDATE reading_materials SET reading_status = 'read' WHERE code = 'RD-20261001-001'`;

    expect(await rollbackLatestMigration(databaseClient, migrations)).toBe(readingMigrationName);
    expect(
      await databaseClient<LegacyContentRow[]>`
        SELECT code, topic, passage_text
        FROM reading_materials
        ORDER BY code
      `,
    ).toEqual([
      { code: 'RD-20261001-001', topic: 'Existing article', passage_text: 'Original article content.' },
      { code: 'RD-20261001-002', topic: 'Deleted story', passage_text: 'Original story content.' },
      { code: 'RD-20261001-003', topic: 'Article without questions', passage_text: 'Only reading content.' },
    ]);
    expect(await databaseClient<CountRow[]>`SELECT COUNT(*)::INTEGER AS count FROM reading_questions`).toEqual([
      { count: 8 },
    ]);
    expect(await databaseClient<UserAnswerRow[]>`SELECT user_answer FROM reading_answers`).toEqual([
      { user_answer: 'Existing user answer' },
    ]);
    expect(
      await databaseClient<ColumnRow[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('reading_settings', 'reading_materials')
          AND column_name IN ('default_question_count', 'target_question_count', 'reading_status', 'title', 'content_text')
      `,
    ).toEqual([]);
    expect(await migrateDatabase(databaseClient, migrations)).toEqual([readingMigrationName]);
  });
});
