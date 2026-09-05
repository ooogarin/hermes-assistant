import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { configureDatabaseClient } from '../src/core/database/client';
import { getMigrationStatus, loadMigrations, migrateDatabase } from '../src/core/database/migration-runner';
import * as notesService from '../src/modules/notes/notes.service';
import { getJakartaDateCodeParts } from '../src/shared/date/date';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient } from '../src/core/database/database.types';

const migrationDirectory = fileURLToPath(new URL('../migrations', import.meta.url));

describe.skipIf(!hasTestDatabaseUrl)('Notes PostgreSQL integration', () => {
  let database: DatabaseClient | undefined;

  const getDatabase = (): DatabaseClient => {
    if (database === undefined) {
      throw new Error('Test database client is not initialized.');
    }

    return database;
  };

  beforeAll(async () => {
    database = createTestDatabaseClient();
    configureDatabaseClient(database);
  });

  beforeEach(async () => {
    const databaseClient = getDatabase();
    await resetTestDatabase(databaseClient);

    const migrations = await loadMigrations(migrationDirectory);
    await migrateDatabase(databaseClient, migrations);
  });

  afterAll(async () => {
    if (database !== undefined) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('creates, searches, updates, and soft deletes notes', async () => {
    const { segment: dateSegment } = getJakartaDateCodeParts(new Date());
    const firstNote = await notesService.create({
      title: 'Postgres advisory lock',
      content: 'An advisory lock prevents concurrent migration runs.',
      type: 'fact',
      category: 'Tech/Programming',
      source: 'postgresql.org',
      sourceContext: null,
      sourceReference: null,
      tags: ['postgres', 'database'],
    });
    const secondNote = await notesService.create({
      title: 'Database idea',
      content: 'Document the migration runner.',
      type: 'idea',
      category: 'Tech/Programming',
      source: null,
      sourceContext: null,
      sourceReference: null,
      tags: ['database'],
    });

    expect(firstNote.code).toBe(`NT-${dateSegment}-001`);
    expect(secondNote.code).toBe(`NT-${dateSegment}-002`);
    expect((await notesService.list({ q: 'advisory', limit: 20 })).map((note) => note.code)).toEqual([firstNote.code]);
    expect((await notesService.list({ tag: 'database', limit: 20 })).map((note) => note.code).sort()).toEqual(
      [firstNote.code, secondNote.code].sort(),
    );

    const updatedNote = await notesService.update(
      { code: firstNote.code },
      {
        category: 'Database',
        tags: ['postgres', 'advisory-lock'],
      },
    );

    expect(updatedNote.category).toBe('Database');
    expect(updatedNote.tags).toEqual(['postgres', 'advisory-lock']);

    await notesService.remove({ code: firstNote.code });

    expect(await notesService.list({ tag: 'advisory-lock', limit: 20 })).toEqual([]);
    await expect(notesService.getDetail({ code: firstNote.code })).rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });

  test('records the notes migration as applied', async () => {
    const migrations = await loadMigrations(migrationDirectory);
    const statuses = await getMigrationStatus(getDatabase(), migrations);

    expect(statuses).toContainEqual({ name: '0001_create_notes.ts', status: 'applied' });
  });
});
