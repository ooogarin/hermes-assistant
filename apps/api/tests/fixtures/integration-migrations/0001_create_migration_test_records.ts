import type { DatabaseTransaction } from '../../../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    CREATE TABLE migration_test_records (
      id INTEGER PRIMARY KEY
    )
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE migration_test_records`;
};
