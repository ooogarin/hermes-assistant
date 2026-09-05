import { resolve } from 'node:path';
import { EnvironmentConfigurationError, loadDatabaseEnvironment } from '../src/core/config/env';
import { createDatabaseClient } from '../src/core/database/client';
import {
  getMigrationStatus,
  loadMigrations,
  migrateDatabase,
  rollbackLatestMigration,
} from '../src/core/database/migration-runner';
import { appLogger, configureLogging } from '../src/core/logging/logger';
import type { DatabaseClient } from '../src/core/database/database.types';

const command = Bun.argv[2];

const isMigrationCommand = (value: string | undefined): value is 'migrate' | 'rollback' | 'status' => {
  return value === 'migrate' || value === 'rollback' || value === 'status';
};

const run = async (): Promise<void> => {
  if (!isMigrationCommand(command)) {
    console.error('Usage: bun scripts/migrate.ts <migrate|rollback|status>');
    process.exitCode = 1;
    return;
  }

  let database: DatabaseClient | undefined;

  try {
    const environment = loadDatabaseEnvironment(Bun.env);
    await configureLogging(environment);

    database = createDatabaseClient(environment.databaseUrl);
    const migrations = await loadMigrations(resolve(import.meta.dir, '../migrations'));

    if (command === 'migrate') {
      const appliedNames = await migrateDatabase(database, migrations);
      console.log(
        appliedNames.length === 0 ? 'Database is up to date.' : `Applied migrations: ${appliedNames.join(', ')}`,
      );
      return;
    }

    if (command === 'rollback') {
      const rolledBackName = await rollbackLatestMigration(database, migrations);
      console.log(rolledBackName === null ? 'No migrations to roll back.' : `Rolled back migration: ${rolledBackName}`);
      return;
    }

    const statuses = await getMigrationStatus(database, migrations);

    if (statuses.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const status of statuses) {
      console.log(`${status.status}: ${status.name}`);
    }
  } catch (error) {
    process.exitCode = 1;

    if (error instanceof EnvironmentConfigurationError) {
      console.error(error.message);
    } else {
      appLogger.error('Database migration command failed: {errorName}', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      console.error(`Database migration ${command} failed.`);
    }
  } finally {
    if (database !== undefined) {
      await database.close().catch(() => {
        process.exitCode = 1;
        appLogger.error('Database connection shutdown failed');
      });
    }
  }
};

await run();
