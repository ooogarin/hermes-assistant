import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import {
  getMigrationStatus,
  loadMigrations,
  migrateDatabase,
  rollbackLatestMigration,
} from '../src/core/database/migration-runner';
import { writingAnalysis } from './fixtures/writing';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';

const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));
const writingMigrationName = '0011_prepare_independent_writing_submissions.ts';
const originalText = '\n  I go yesterday.\n';

type SubmissionRow = {
  code: string | null;
  material_id: number | null;
  submission_number: number | null;
  original_text: string;
  word_count: number;
  estimated_topic: string | null;
  estimated_genre: string | null;
  estimated_tags: string[] | null;
  estimated_level: string | null;
  analysis: unknown | null;
  analysis_status: 'not_analyzed' | 'analyzed';
  analyzed_at: Date | null;
  revision: number;
};

const getSubmission = async (database: DatabaseClient, code: string): Promise<SubmissionRow | undefined> => {
  const [row] = await database<SubmissionRow[]>`
    SELECT
      code,
      material_id,
      submission_number,
      original_text,
      word_count,
      estimated_topic,
      estimated_genre,
      estimated_tags,
      estimated_level,
      analysis,
      analysis_status,
      analyzed_at,
      revision
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

    await databaseClient`
      INSERT INTO writing_materials (
        code,
        topic,
        prompt_text,
        level,
        genre,
        target_word_count,
        is_override,
        source
      )
      VALUES (
        'WR-20261002-001',
        'Food',
        'Describe your favorite food.',
        'A1',
        'journal',
        150,
        FALSE,
        'cron'
      )
    `;
  });

  afterAll(async () => {
    if (database !== undefined) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('allows free and prompted text to be saved without feedback or a legacy number', async () => {
    const databaseClient = getDatabase();

    await applyMigration();
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
        submission_number: null,
        original_text: originalText,
        estimated_topic: null,
        estimated_genre: null,
        estimated_tags: null,
        estimated_level: null,
        analysis: null,
        analysis_status: 'not_analyzed',
        analyzed_at: null,
        revision: 1,
      });
    }

    expect((await getSubmission(databaseClient, 'WS-20261003-003'))?.material_id).toBeNull();
    expect((await getSubmission(databaseClient, 'WS-20261003-004'))?.material_id).not.toBeNull();

    await databaseClient`
      UPDATE writing_submissions
      SET
        estimated_topic = 'User topic',
        revision = revision + 1,
        updated_at = NOW()
      WHERE code = 'WS-20261003-003'
    `;

    expect(await getSubmission(databaseClient, 'WS-20261003-003')).toMatchObject({
      estimated_topic: 'User topic',
      analysis_status: 'not_analyzed',
      revision: 2,
    });
  });

  test('keeps the existing analyzed-submission insert contract working during transition', async () => {
    const databaseClient = getDatabase();

    await applyMigration();

    const rows = await databaseClient<Array<{ code: null; analysis_status: string; analyzed_at: null }>>`
      INSERT INTO writing_submissions (
        material_id,
        submission_number,
        original_text,
        word_count,
        estimated_level,
        analysis
      )
      SELECT
        id,
        4,
        ${originalText},
        3,
        'A1',
        ${JSON.stringify(writingAnalysis)}::JSONB
      FROM writing_materials
      RETURNING
        code,
        analysis_status,
        analyzed_at
    `;

    expect(rows).toEqual([{ code: null, analysis_status: 'analyzed', analyzed_at: null }]);
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
          original_text,
          word_count
        )
        VALUES (
          '  ',
          1
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          original_text,
          word_count,
          analysis
        )
        VALUES (
          'Text',
          1,
          'null'::JSONB
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          original_text,
          word_count,
          analyzed_at
        )
        VALUES (
          'Text',
          1,
          NOW()
        )
      `,
      () => databaseClient`
        INSERT INTO writing_submissions (
          original_text,
          word_count,
          submission_number
        )
        VALUES (
          'Text',
          1,
          1
        )
      `,
    ];

    for (const insert of invalidWrites) {
      await expect(Promise.resolve(insert())).rejects.toMatchObject({ errno: '23514' });
    }

    await expect(
      Promise.resolve(databaseClient`
        UPDATE writing_submissions
        SET
          analysis_status = 'not_analyzed'
        WHERE code = 'WS-20261003-002'
      `),
    ).rejects.toMatchObject({ errno: '428C9' });
  });

  test('rolls back the empty schema and can reapply the migration', async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();

    expect(await applyMigration()).toEqual([writingMigrationName]);
    expect(await applyMigration()).toEqual([]);
    expect(await rollbackLatestMigration(databaseClient, migrations)).toBe(writingMigrationName);
    expect(await applyMigration()).toEqual([writingMigrationName]);
  });

  test('refuses a destructive rollback when free writing or new metadata exists', async () => {
    const databaseClient = getDatabase();
    const migrations = await getMigrations();

    await applyMigration();
    await insertPendingSubmission(databaseClient, 'WS-20261003-002');
    await databaseClient`
      UPDATE writing_submissions
      SET
        estimated_topic = 'Corrected topic'
      WHERE code = 'WS-20261003-002'
    `;

    await expect(rollbackLatestMigration(databaseClient, migrations)).rejects.toMatchObject({ errno: '55000' });

    expect((await getSubmission(databaseClient, 'WS-20261003-002'))?.estimated_topic).toBe('Corrected topic');

    await databaseClient`
      UPDATE writing_submissions
      SET
        estimated_topic = NULL
      WHERE code = 'WS-20261003-002'
    `;
    await insertPendingSubmission(databaseClient, 'WS-20261003-003');

    await expect(rollbackLatestMigration(databaseClient, migrations)).rejects.toMatchObject({ errno: '55000' });
    expect((await getSubmission(databaseClient, 'WS-20261003-003'))?.original_text).toBe(originalText);
    expect(await getMigrationStatus(databaseClient, migrations)).toContainEqual({
      name: writingMigrationName,
      status: 'applied',
    });
  });
});
