import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  // Practice and exam scores weight partial answers as 0.5, so the score must hold decimals.
  await trx`
    ALTER TABLE grammar_sessions
    ALTER COLUMN score TYPE NUMERIC(5,2)
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    ALTER TABLE grammar_sessions
    ALTER COLUMN score TYPE INTEGER
    USING ROUND(score)::INTEGER
  `;
};
