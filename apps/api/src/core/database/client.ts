import { SQL } from 'bun';
import type { DatabaseClient, DatabaseReservedConnection } from './database.types';

export const createDatabaseClient = (databaseUrl: string): DatabaseClient => new SQL(databaseUrl);

let databaseClient: DatabaseClient | undefined;

export const configureDatabaseClient = (client: DatabaseClient): void => {
  databaseClient = client;
};

export const getDatabaseClient = (): DatabaseClient => {
  if (databaseClient === undefined) {
    throw new Error('Database client has not been configured.');
  }

  return databaseClient;
};

export const startTransaction = async (): Promise<DatabaseReservedConnection> => {
  const trx = await getDatabaseClient().reserve();

  try {
    await trx`BEGIN`;
  } catch (error) {
    trx.release();
    throw error;
  }

  return trx;
};

export const commitTransaction = async (trx: DatabaseReservedConnection): Promise<void> => {
  try {
    await trx`COMMIT`;
  } catch (error) {
    // A failed COMMIT can leave PostgreSQL in an aborted transaction; cleanup must not replace the original error.
    try {
      await trx`ROLLBACK`;
    } catch {
      // The connection may already be unusable, but release still has to run.
    }

    throw error;
  } finally {
    trx.release();
  }
};

export const rollbackTransaction = async (trx: DatabaseReservedConnection): Promise<void> => {
  try {
    await trx`ROLLBACK`;
  } finally {
    trx.release();
  }
};
