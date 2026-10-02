import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseClient, DatabaseConnection } from './database.types';
import type { Migration, MigrationDefinition, MigrationStatus } from './migration.types';

type MigrationRow = {
  name: string;
};

type MigrationTableRow = {
  exists: boolean;
};

const migrationNamePattern = /^(\d{4})_[a-z0-9][a-z0-9_-]*\.ts$/;
const migrationLockId = 724_093_239;

const ensureMigrationTable = async (database: DatabaseConnection): Promise<void> => {
  await database`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

const hasMigrationTable = async (database: DatabaseConnection): Promise<boolean> => {
  const [row] = await database<MigrationTableRow[]>`
    SELECT
      to_regclass('_migrations') IS NOT NULL AS exists
  `;

  return row?.exists === true;
};

const appliedMigrationNames = async (database: DatabaseConnection): Promise<string[]> => {
  const migrationTableExists = await hasMigrationTable(database);

  if (!migrationTableExists) {
    return [];
  }

  const rows = await database<MigrationRow[]>`
    SELECT
      name
    FROM _migrations
    ORDER BY
      applied_at ASC,
      name ASC
  `;

  return rows.map((row) => row.name);
};

const isMigrationDefinition = (value: unknown): value is MigrationDefinition => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const migration = value as Partial<MigrationDefinition>;

  return typeof migration.up === 'function' && typeof migration.down === 'function';
};

const assertAppliedMigrationsExist = (migrations: readonly Migration[], appliedNames: readonly string[]): void => {
  const availableNames = new Set(migrations.map((migration) => migration.name));
  const missingNames = appliedNames.filter((name) => !availableNames.has(name));

  if (missingNames.length > 0) {
    throw new Error(`Applied migrations are missing from disk: ${missingNames.join(', ')}`);
  }
};

const withMigrationLock = async <T>(
  database: DatabaseClient,
  operation: (connection: Bun.ReservedSQL) => Promise<T>,
): Promise<T> => {
  const connection = await database.reserve();

  let lockAcquired = false;

  try {
    await connection`
      SELECT
        pg_advisory_lock(${migrationLockId}::BIGINT)
    `;
    lockAcquired = true;

    let operationCompleted = false;

    try {
      const result = await operation(connection);

      operationCompleted = true;
      await connection`
        SELECT
          pg_advisory_unlock(${migrationLockId}::BIGINT)
      `;
      lockAcquired = false;

      return result;
    } catch (error) {
      const needsLockCleanup = lockAcquired && !operationCompleted;

      if (needsLockCleanup) {
        try {
          await connection`
            SELECT
              pg_advisory_unlock(${migrationLockId}::BIGINT)
          `;
        } catch {
          // Preserve the migration operation error when lock cleanup also fails.
        }
      }

      throw error;
    }
  } finally {
    connection.release();
  }
};

export const loadMigrations = async (migrationDirectory: string): Promise<Migration[]> => {
  const entries = await readdir(migrationDirectory, { withFileTypes: true });

  const migrationFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const sequences = new Set<string>();

  return Promise.all(
    migrationFileNames.map(async (fileName) => {
      const sequence = migrationNamePattern.exec(fileName)?.[1];

      if (sequence === undefined) {
        throw new Error(`Invalid migration filename: ${fileName}`);
      }

      if (sequences.has(sequence)) {
        throw new Error(`Duplicate migration sequence: ${sequence}`);
      }

      sequences.add(sequence);

      const filePath = resolve(migrationDirectory, fileName);

      const migrationModule: unknown = await import(pathToFileURL(filePath).href);

      if (!isMigrationDefinition(migrationModule)) {
        throw new Error(`Migration must export up and down functions: ${fileName}`);
      }

      return {
        name: fileName,
        up: migrationModule.up,
        down: migrationModule.down,
      };
    }),
  );
};

export const getMigrationStatus = async (
  database: DatabaseClient,
  migrations: readonly Migration[],
): Promise<MigrationStatus[]> => {
  const appliedNames = await appliedMigrationNames(database);

  const appliedNameSet = new Set(appliedNames);
  const availableNameSet = new Set(migrations.map((migration) => migration.name));

  const knownMigrationStatuses: MigrationStatus[] = migrations.map((migration) => ({
    name: migration.name,
    status: appliedNameSet.has(migration.name) ? 'applied' : 'pending',
  }));
  const missingMigrationStatuses: MigrationStatus[] = appliedNames
    .filter((name) => !availableNameSet.has(name))
    .map((name) => ({ name, status: 'missing' }));

  return [...knownMigrationStatuses, ...missingMigrationStatuses];
};

export const migrateDatabase = async (
  database: DatabaseClient,
  migrations: readonly Migration[],
): Promise<string[]> => {
  return withMigrationLock(database, async (connection) => {
    await ensureMigrationTable(connection);

    const appliedNames = await appliedMigrationNames(connection);

    assertAppliedMigrationsExist(migrations, appliedNames);

    const appliedNameSet = new Set(appliedNames);
    const pendingMigrations = migrations.filter((migration) => !appliedNameSet.has(migration.name));

    for (const migration of pendingMigrations) {
      await connection.begin(async (trx) => {
        await migration.up(trx);
        await trx`
          INSERT INTO _migrations (
            name
          )
          VALUES (
            ${migration.name}
          )
        `;
      });
    }

    return pendingMigrations.map((migration) => migration.name);
  });
};

export const rollbackLatestMigration = async (
  database: DatabaseClient,
  migrations: readonly Migration[],
): Promise<string | null> => {
  return withMigrationLock(database, async (connection) => {
    const appliedNames = await appliedMigrationNames(connection);

    if (appliedNames.length === 0) {
      return null;
    }

    assertAppliedMigrationsExist(migrations, appliedNames);

    const latestMigrationName = appliedNames.at(-1);
    const migration = migrations.find((candidate) => candidate.name === latestMigrationName);

    if (migration === undefined) {
      throw new Error('Unable to resolve the latest applied migration.');
    }

    await connection.begin(async (trx) => {
      await migration.down(trx);
      await trx`DELETE FROM _migrations WHERE name = ${migration.name}`;
    });

    return migration.name;
  });
};
