import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`ALTER TABLE reading_materials RENAME COLUMN topic TO title`;
  await trx`ALTER TABLE reading_materials RENAME COLUMN passage_text TO content_text`;
  await trx`
    ALTER TABLE reading_settings
    ADD COLUMN default_question_count INTEGER NOT NULL DEFAULT 3,
    ADD CONSTRAINT chk_reading_settings_question_count
      CHECK (default_question_count BETWEEN 0 AND 20)
  `;
  await trx`
    ALTER TABLE reading_materials
    ADD COLUMN target_question_count INTEGER,
    ADD COLUMN reading_status TEXT NOT NULL DEFAULT 'unread',
    ADD CONSTRAINT chk_reading_materials_question_count
      CHECK (target_question_count BETWEEN 0 AND 20),
    ADD CONSTRAINT chk_reading_materials_reading_status
      CHECK (reading_status IN ('unread', 'read'))
  `;
  // Include deleted questions so the snapshot retains the original generation count.
  await trx`
    UPDATE reading_materials m
    SET target_question_count = (
      SELECT COUNT(*)::INTEGER
      FROM reading_questions q
      WHERE q.material_id = m.id
    )
  `;
  await trx`
    ALTER TABLE reading_materials
    ALTER COLUMN target_question_count SET NOT NULL
  `;
  await trx`
    CREATE INDEX idx_reading_materials_active_reading_status
    ON reading_materials (reading_status, created_at DESC, id DESC)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP INDEX idx_reading_materials_active_reading_status`;
  await trx`
    ALTER TABLE reading_materials
    DROP COLUMN target_question_count,
    DROP COLUMN reading_status
  `;
  await trx`ALTER TABLE reading_settings DROP COLUMN default_question_count`;
  await trx`ALTER TABLE reading_materials RENAME COLUMN content_text TO passage_text`;
  await trx`ALTER TABLE reading_materials RENAME COLUMN title TO topic`;
};
