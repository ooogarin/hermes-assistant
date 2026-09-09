import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    ALTER TABLE reading_submissions
    DROP CONSTRAINT reading_submissions_material_id_key
  `;
  await trx`
    CREATE UNIQUE INDEX uq_reading_submissions_active_material
    ON reading_submissions (material_id)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP INDEX uq_reading_submissions_active_material`;
  await trx`
    ALTER TABLE reading_submissions
    ADD CONSTRAINT reading_submissions_material_id_key UNIQUE (material_id)
  `;
};
