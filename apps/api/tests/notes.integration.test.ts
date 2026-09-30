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
      content_text: 'An advisory lock prevents concurrent migration runs.',
      raw_text: null,
      type: 'fact',
      category: 'tech/programming',
      source_name: 'postgresql.org',
      source_url: null,
      source_context: null,
      source_reference: null,
      tags: ['postgres', 'database'],
    });
    const secondNote = await notesService.create({
      title: 'Database idea',
      content_text: 'Document the migration runner.',
      raw_text: null,
      type: 'idea',
      category: 'tech/programming',
      source_name: null,
      source_url: null,
      source_context: null,
      source_reference: null,
      tags: ['database'],
    });

    expect(firstNote.code).toBe(`NT-${dateSegment}-001`);
    expect(secondNote.code).toBe(`NT-${dateSegment}-002`);
    expect((await notesService.list({ q: 'advisory', sort: 'newest', limit: 20 })).map((note) => note.code)).toEqual([
      firstNote.code,
    ]);
    expect(
      (await notesService.list({ tag: 'database', sort: 'newest', limit: 20 })).map((note) => note.code).sort(),
    ).toEqual([firstNote.code, secondNote.code].sort());

    const updatedNote = await notesService.update(
      { code: firstNote.code },
      {
        category: 'Database',
        tags: ['postgres', 'advisory-lock'],
      },
    );

    expect(updatedNote.category).toBe('Database');
    expect(updatedNote.tags).toEqual(['Postgres', 'Advisory-Lock']);

    await notesService.remove({ code: firstNote.code });

    expect(await notesService.list({ tag: 'advisory-lock', sort: 'newest', limit: 20 })).toEqual([]);
    await expect(notesService.getDetail({ code: firstNote.code })).rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });

  test('records the notes migration as applied', async () => {
    const migrations = await loadMigrations(migrationDirectory);
    const statuses = await getMigrationStatus(getDatabase(), migrations);

    expect(statuses).toContainEqual({ name: '0001_create_notes.ts', status: 'applied' });
    expect(statuses).toContainEqual({ name: '0009_align_notes_junk_schema.ts', status: 'applied' });
  });

  test('preserves existing note content and source when aligning the schema', async () => {
    const databaseClient = getDatabase();
    const migrations = await loadMigrations(migrationDirectory);
    await resetTestDatabase(databaseClient);
    await migrateDatabase(
      databaseClient,
      migrations.filter(({ name }) => name !== '0009_align_notes_junk_schema.ts'),
    );
    await databaseClient`
      INSERT INTO notes (code, title, content, type, category, source)
      VALUES ('NT-20260906-001', 'Existing note', 'Original content', 'fact', 'tech', 'Personal journal')
    `;

    await migrateDatabase(databaseClient, migrations);

    const [note] = await databaseClient<
      { content_text: string; source_name: string | null; source_url: string | null; raw_text: string | null }[]
    >`
      SELECT content_text, source_name, source_url, raw_text
      FROM notes
      WHERE code = 'NT-20260906-001'
    `;
    expect(note).toEqual({
      content_text: 'Original content',
      source_name: 'Personal journal',
      source_url: null,
      raw_text: null,
    });
  });
});
