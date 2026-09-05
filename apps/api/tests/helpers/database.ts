import { createDatabaseClient } from '../../src/core/database/client';
import type { DatabaseClient } from '../../src/core/database/database.types';

const testDatabaseUrl = Bun.env.TEST_DATABASE_URL;

export const hasTestDatabaseUrl = testDatabaseUrl !== undefined;

export const createTestDatabaseClient = (): DatabaseClient => {
  if (testDatabaseUrl === undefined) {
    throw new Error('TEST_DATABASE_URL is required for database integration tests.');
  }

  let databaseName: string;

  try {
    const url = new URL(testDatabaseUrl);

    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('unsupported protocol');
    }

    databaseName = url.pathname.slice(1);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must target a database whose name ends in _test.');
  }

  return createDatabaseClient(testDatabaseUrl);
};

export const resetTestDatabase = async (database: DatabaseClient): Promise<void> => {
  await database`DROP SCHEMA IF EXISTS public CASCADE`;
  await database`CREATE SCHEMA public`;
};
