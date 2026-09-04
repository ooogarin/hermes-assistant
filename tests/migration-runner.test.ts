import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { loadMigrations } from '../src/core/database/migration-runner';

test('loads migration files in sequence order', async () => {
  const migrations = await loadMigrations(fileURLToPath(new URL('./fixtures/migrations', import.meta.url)));

  expect(migrations.map((migration) => migration.name)).toEqual([
    '0001_first_migration.ts',
    '0010_second_migration.ts',
  ]);
});
