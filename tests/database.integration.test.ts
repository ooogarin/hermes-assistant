import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app';
import { isDatabaseReady } from '../src/core/database/health.repository';
import {
  getMigrationStatus,
  loadMigrations,
  migrateDatabase,
  rollbackLatestMigration,
} from '../src/core/database/migration-runner';
import { createTestDatabaseClient, hasTestDatabaseUrl, resetTestDatabase } from './helpers/database';
import type { DatabaseClient, DatabaseTransaction } from '../src/core/database/database.types';
import type { Migration } from '../src/core/database/migration.types';

type RelationRow = {
  exists: boolean;
};

const migrationDirectory = fileURLToPath(new URL('./fixtures/integration-migrations', import.meta.url));

const tableExists = async (database: DatabaseClient, tableName: string): Promise<boolean> => {
  const [row] = await database<RelationRow[]>`SELECT to_regclass(${tableName}) IS NOT NULL AS exists`;

  return row?.exists === true;
};

describe.skipIf(!hasTestDatabaseUrl)('PostgreSQL integration', () => {
  let database: DatabaseClient | undefined;

  const getDatabase = (): DatabaseClient => {
    if (database === undefined) {
      throw new Error('Test database client is not initialized.');
    }

    return database;
  };

  beforeAll(async () => {
    database = createTestDatabaseClient();
    await resetTestDatabase(database);
  });

  beforeEach(async () => {
    await resetTestDatabase(getDatabase());
  });

  afterAll(async () => {
    if (database !== undefined) {
      await resetTestDatabase(database);
      await database.close();
    }
  });

  test('reports readiness through the HTTP application', async () => {
    const app = createApp({
      internalApiKey: 'test-api-key',
      isDatabaseReady: () => isDatabaseReady(getDatabase()),
    });

    const response = await app.request('http://localhost/health/ready');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { status: 'ok' } });
  });

  test('applies, reports, and rolls back an isolated migration', async () => {
    const migrations = await loadMigrations(migrationDirectory);
    const databaseClient = getDatabase();

    expect(await getMigrationStatus(databaseClient, migrations)).toEqual([
      { name: '0001_create_migration_test_records.ts', status: 'pending' },
    ]);

    expect(await migrateDatabase(databaseClient, migrations)).toEqual(['0001_create_migration_test_records.ts']);
    expect(await tableExists(databaseClient, 'migration_test_records')).toBe(true);
    expect(await getMigrationStatus(databaseClient, migrations)).toEqual([
      { name: '0001_create_migration_test_records.ts', status: 'applied' },
    ]);

    expect(await rollbackLatestMigration(databaseClient, migrations)).toBe('0001_create_migration_test_records.ts');
    expect(await tableExists(databaseClient, 'migration_test_records')).toBe(false);
  });

  test('rolls back a failed migration and its tracking record together', async () => {
    const failedMigration: Migration = {
      name: '0001_failed_migration.ts',
      up: async (transaction: DatabaseTransaction) => {
        await transaction`CREATE TABLE failed_migration_records (id INTEGER PRIMARY KEY)`;
        throw new Error('Intentional migration failure');
      },
      down: async (transaction: DatabaseTransaction) => {
        await transaction`DROP TABLE failed_migration_records`;
      },
    };
    const databaseClient = getDatabase();

    await expect(migrateDatabase(databaseClient, [failedMigration])).rejects.toThrow('Intentional migration failure');

    expect(await tableExists(databaseClient, 'failed_migration_records')).toBe(false);
    expect(await getMigrationStatus(databaseClient, [failedMigration])).toEqual([
      { name: '0001_failed_migration.ts', status: 'pending' },
    ]);
  });

  test('serializes concurrent migration runs', async () => {
    const concurrentMigration: Migration = {
      name: '0001_concurrent_migration.ts',
      up: async (transaction: DatabaseTransaction) => {
        await transaction`SELECT pg_sleep(0.05)`;
        await transaction`CREATE TABLE concurrent_migration_records (id INTEGER PRIMARY KEY)`;
      },
      down: async (transaction: DatabaseTransaction) => {
        await transaction`DROP TABLE concurrent_migration_records`;
      },
    };
    const firstClient = getDatabase();
    const secondClient = createTestDatabaseClient();

    try {
      const results = await Promise.all([
        migrateDatabase(firstClient, [concurrentMigration]),
        migrateDatabase(secondClient, [concurrentMigration]),
      ]);

      expect(results.flat()).toEqual(['0001_concurrent_migration.ts']);
      expect(await tableExists(firstClient, 'concurrent_migration_records')).toBe(true);
    } finally {
      await secondClient.close();
    }
  });

  test('rolls back a failed transaction', async () => {
    const databaseClient = getDatabase();

    await expect(
      databaseClient.begin(async (transaction) => {
        await transaction`CREATE TABLE transaction_test_records (id INTEGER PRIMARY KEY)`;
        throw new Error('Intentional transaction failure');
      }),
    ).rejects.toThrow('Intentional transaction failure');

    expect(await tableExists(databaseClient, 'transaction_test_records')).toBe(false);
  });
});
