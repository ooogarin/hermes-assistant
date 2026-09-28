import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    ALTER TABLE junk_items
    ADD COLUMN source_name TEXT,
    ADD CONSTRAINT chk_junk_items_source_name
      CHECK (source_name IS NULL OR (char_length(btrim(source_name)) BETWEEN 1 AND 200))
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`ALTER TABLE junk_items DROP COLUMN source_name`;
};
