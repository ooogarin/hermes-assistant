import type { DatabaseTransaction } from '../../../src/core/database/database.types';

export const up = async (transaction: DatabaseTransaction): Promise<void> => {
  await transaction`
    CREATE TABLE migration_test_records (
      id INTEGER PRIMARY KEY
    )
  `;
};

export const down = async (transaction: DatabaseTransaction): Promise<void> => {
  await transaction`DROP TABLE migration_test_records`;
};
