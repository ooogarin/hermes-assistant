import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMigrations } from '../src/core/database/migration-runner';

test('loads migration files in sequence order', async () => {
  const migrations = await loadMigrations(fileURLToPath(new URL('./fixtures/migrations', import.meta.url)));

  expect(migrations.map((migration) => migration.name)).toEqual([
    '0001_first_migration.ts',
    '0010_second_migration.ts',
  ]);
});

test('rejects a migration sequence that is not four digits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hermes-invalid-migration-'));

  try {
    await writeFile(join(directory, '1_invalid.ts'), 'export const up = () => {}; export const down = () => {};');

    await expect(loadMigrations(directory)).rejects.toThrow('Invalid migration filename: 1_invalid.ts');
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('rejects duplicate migration sequences', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hermes-duplicate-migration-'));
  const migrationSource = 'export const up = () => {}; export const down = () => {};';

  try {
    await Promise.all([
      writeFile(join(directory, '0001_first.ts'), migrationSource),
      writeFile(join(directory, '0001_second.ts'), migrationSource),
    ]);

    await expect(loadMigrations(directory)).rejects.toThrow('Duplicate migration sequence: 0001');
  } finally {
    await rm(directory, { recursive: true });
  }
});
