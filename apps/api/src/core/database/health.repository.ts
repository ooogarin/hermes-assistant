import type { DatabaseClient } from './database.types';

export const isDatabaseReady = async (database: DatabaseClient): Promise<boolean> => {
  try {
    await database`
      SELECT
        1
    `;

    return true;
  } catch {
    return false;
  }
};
