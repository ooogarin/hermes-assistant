import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import {
  getMigrationStatus,
  loadMigrations,
  migrateDatabase,
  rollbackLatestMigration,
} from '../src/core/database/migration-runner';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';

const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));
const writingMigrationName = '0011_prepare_independent_writing_submissions.ts';
const originalText = '\n  I go yesterday.\n';

type SubmissionRow = {
  code: string;
  material_id: number | null;
  original_text: string;
  word_count: number;
  estimated_topic: string | null;
  estimated_genre: string | null;
  estimated_tags: string[] | null;
  estimated_level: string | null;
  analysis: unknown | null;
  analysis_status: 'not_analyzed' | 'analyzed';
  analyzed_at: Date | null;
};

const getSubmission = async (database: DatabaseClient, code: string): Promise<SubmissionRow | undefined> => {
  const [row] = await database<SubmissionRow[]>`
    SELECT
      code,
      material_id,
      original_text,
      word_count,
      estimated_topic,
      estimated_genre,
      estimated_tags,
      estimated_level,
      analysis,
      CASE WHEN analysis IS NULL THEN 'not_analyzed' ELSE 'analyzed' END AS analysis_status,
      analyzed_at
    FROM writing_submissions
    WHERE code = ${code}
  `;

  return row;
};

const insertPendingSubmission = async (database: DatabaseClient, code: string): Promise<void> => {
  await database`
    INSERT INTO writing_submissions (
      code,
      original_text,
      word_count
    )
    VALUES (
      ${code},
      ${originalText},
      3
    )
  `;
};

const insertMaterial = async (database: DatabaseClient): Promise<void> => {
  await database`
    INSERT INTO writing_materials (
      code,
      topic,
      prompt_text,
      level,
      genre,
      target_word_count,
      source
    )
    VALUES (
      'WR-20261002-001',
      'Food',
      'Describe your favorite food.',
      'A1',
      'journal',
      150,
      'cron'
    )
  `;
};

describe.skipIf(!hasTestDatabaseUrl)('Writing schema PostgreSQL integration', () => {
  let database: DatabaseClient | undefined;

  const getDatabase = (): DatabaseClient => {
    if (database === undefined) {
      throw new Error('Test database client is not initialized.');
    }

    return database;
  };

  const getMigrations = async () => {
    const migrations = await loadMigrations(migrationDirectory);

    return migrations.filter(({ name }) => name <= writingMigrationName);
  };

  const applyMigration = async () => {
    const migrations = await getMigrations();

    return migrateDatabase(getDatabase(), migrations);
  };

  beforeAll(() => {
    database = createTestDatabaseClient();
  });

  beforeEach(async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();

    await resetTestDatabase(databaseClient);
    await migrateDatabase(
      databaseClient,
      migrations.filter(({ name }) => name < writingMigrationName),
    );
  });

  afterAll(async () => {
    if (database !== undefined) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('allows free and prompted text to be saved before analysis', async () => {
    const databaseClient = getDatabase();

    await applyMigration();
    await insertMaterial(databaseClient);
    await insertPendingSubmission(databaseClient, 'WS-20261003-003');
    await databaseClient`
      INSERT INTO writing_submissions (
        code,
        material_id,
        original_text,
        word_count
      )
      SELECT
        'WS-20261003-004',
        id,
        ${originalText},
        3
      FROM writing_materials
    `;

    for (const code of ['WS-20261003-003', 'WS-20261003-004']) {
      expect(await getSubmission(databaseClient, code)).toMatchObject({
        code,
        original_text: originalText,
        estimated_topic: null,
        estimated_genre: null,
        estimated_tags: null,
        estimated_level: null,
        analysis: null,
        analysis_status: 'not_analyzed',
        analyzed_at: null,
      });
    }

    expect((await getSubmission(databaseClient, 'WS-20261003-003'))?.material_id).toBeNull();
    expect((await getSubmission(databaseClient, 'WS-20261003-004'))?.material_id).not.toBeNull();

    await databaseClient`
      UPDATE writing_submissions
      SET
        estimated_topic = 'User topic',
        updated_at = NOW()
      WHERE code = 'WS-20261003-003'
    `;

    expect(await getSubmission(databaseClient, 'WS-20261003-003')).toMatchObject({
      estimated_topic: 'User topic',
      analysis_status: 'not_analyzed',
    });

    const feedback = { corrected_text: 'I went yesterday.', prompt_adherence: null };

    await databaseClient`
      UPDATE writing_submissions
      SET
        analysis = ${feedback}::JSONB,
        analyzed_at = NOW(),
        estimated_genre = 'journal',
        estimated_tags = ARRAY['daily life'],
        estimated_level = 'A1',
        updated_at = NOW()
      WHERE code = 'WS-20261003-003'
    `;

    expect(await getSubmission(databaseClient, 'WS-20261003-003')).toMatchObject({
      estimated_topic: 'User topic',
      analysis: feedback,
      analysis_status: 'analyzed',
      analyzed_at: expect.any(Date),
    });
  });

  test('requires submission codes and removes obsolete columns and the number index', async () => {
    const databaseClient = getDatabase();

    await applyMigration();

    const columns = await databaseClient<Array<{ column_name: string; is_nullable: string }>>`
      SELECT
        column_name,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = CURRENT_SCHEMA()
        AND table_name = 'writing_submissions'
        AND column_name IN ('code', 'submission_number', 'submitted_at', 'analysis_status', 'revision')
    `;

    expect(columns).toEqual([{ column_name: 'code', is_nullable: 'NO' }]);

    const overrideColumns = await databaseClient<Array<{ column_name: string }>>`
      SELECT
        column_name
      FROM information_schema.columns
      WHERE table_schema = CURRENT_SCHEMA()
        AND table_name = 'writing_materials'
        AND column_name = 'is_override'
    `;

    expect(overrideColumns).toHaveLength(0);

    const oldIndexes = await databaseClient<Array<{ indexname: string }>>`
      SELECT
        indexname
      FROM pg_indexes
      WHERE schemaname = CURRENT_SCHEMA()
        AND indexname = 'idx_writing_submissions_material'
    `;

    expect(oldIndexes).toHaveLength(0);

    await expect(
      Promise.resolve(databaseClient`
        INSERT INTO writing_submissions (
          original_text,
          word_count
        )
        VALUES (
          'Text',
          1
        )
      `),
    ).rejects.toMatchObject({ errno: '23502' });
  });

  test('enforces unique deleted codes, nonblank text, JSON object feedback and valid analysis timestamps', async () => {
    const databaseClient = getDatabase();

    await applyMigration();

    await insertPendingSubmission(databaseClient, 'WS-20261003-002');
    await databaseClient`
      UPDATE writing_submissions
      SET
        deleted_at = NOW()
      WHERE code = 'WS-20261003-002'
    `;

    await expect(insertPendingSubmission(databaseClient, 'WS-20261003-002')).rejects.toMatchObject({
      errno: '23505',
    });

    const invalidWrites = [
      () => databaseClient`
        INSERT INTO writing_submissions (
          code,
          original_text,
          word_count
        )
        VALUES (
          'WS-20261003-010',
          '  ',
          1
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          code,
          original_text,
          word_count,
          analysis,
          analyzed_at
        )
        VALUES (
          'WS-20261003-011',
          'Text',
          1,
          'null'::JSONB,
          NOW()
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          code,
          original_text,
          word_count,
          analyzed_at
        )
        VALUES (
          'WS-20261003-012',
          'Text',
          1,
          NOW()
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          code,
          original_text,
          word_count,
          analysis
        )
        VALUES (
          'WS-20261003-013',
          'Text',
          1,
          '{}'::JSONB
        )
      `,
    ];

    for (const insert of invalidWrites) {
      await expect(Promise.resolve(insert())).rejects.toMatchObject({ errno: '23514' });
    }
  });

  test('rolls back the empty schema and can reapply the migration', async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();

    expect(await applyMigration()).toEqual([writingMigrationName]);
    expect(await applyMigration()).toEqual([]);
    expect(await rollbackLatestMigration(databaseClient, migrations)).toBe(writingMigrationName);
    expect(await applyMigration()).toEqual([writingMigrationName]);
  });

  test('refuses rollback after a material is saved without submissions', async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();

    await applyMigration();
    await insertMaterial(databaseClient);

    await expect(rollbackLatestMigration(databaseClient, migrations)).rejects.toThrow(
      'Writing rollback requires empty writing_materials and writing_submissions tables.',
    );
  });

  test('refuses rollback after any submission is saved', async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();
    const code = 'WS-20261003-002';

    await applyMigration();
    await insertPendingSubmission(databaseClient, code);

    await expect(rollbackLatestMigration(databaseClient, migrations)).rejects.toThrow(
      'Writing rollback requires empty writing_materials and writing_submissions tables.',
    );

    expect((await getSubmission(databaseClient, code))?.original_text).toBe(originalText);
    expect(await getMigrationStatus(databaseClient, migrations)).toContainEqual({
      name: writingMigrationName,
      status: 'applied',
    });
  });
});
