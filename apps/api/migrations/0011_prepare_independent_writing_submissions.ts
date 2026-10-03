import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  // Writing data is assumed empty; this migration only changes the schema.
  await trx`
    ALTER TABLE writing_submissions
    ALTER COLUMN material_id DROP NOT NULL,
    ALTER COLUMN submission_number DROP NOT NULL,
    ALTER COLUMN estimated_level DROP NOT NULL,
    ALTER COLUMN analysis DROP NOT NULL,
    ADD COLUMN code TEXT,
    ADD COLUMN estimated_topic TEXT,
    ADD COLUMN estimated_genre TEXT,
    ADD COLUMN estimated_tags TEXT[],
    ADD COLUMN analyzed_at TIMESTAMPTZ,
    ADD COLUMN revision INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN analysis_status TEXT GENERATED ALWAYS AS (
      CASE WHEN analysis IS NULL THEN 'not_analyzed' ELSE 'analyzed' END
    ) STORED NOT NULL,
    ADD CONSTRAINT uq_writing_submissions_code UNIQUE (code),
    ADD CONSTRAINT chk_writing_submissions_code
      CHECK (code IS NULL OR code ~ '^WS-[0-9]{8}-[0-9]{3,}$'),
    ADD CONSTRAINT chk_writing_submissions_revision CHECK (revision > 0),
    ADD CONSTRAINT chk_writing_submissions_original_text
      CHECK (original_text ~ '[^[:space:]]'),
    ADD CONSTRAINT chk_writing_submissions_analysis_object
      CHECK (analysis IS NULL OR JSONB_TYPEOF(analysis) = 'object'),
    ADD CONSTRAINT chk_writing_submissions_analysis_time
      CHECK (analyzed_at IS NULL OR analysis IS NOT NULL),
    ADD CONSTRAINT chk_writing_submissions_legacy_number
      CHECK (submission_number IS NULL OR material_id IS NOT NULL)
  `;

  await trx`
    CREATE INDEX idx_writing_submissions_active_created
    ON writing_submissions (created_at DESC, id DESC)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_writing_submissions_active_material_created
    ON writing_submissions (material_id, created_at DESC, id DESC)
    WHERE deleted_at IS NULL AND material_id IS NOT NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  // Block concurrent writes while checking whether the old schema can represent every row.
  await trx`LOCK TABLE writing_submissions IN ACCESS EXCLUSIVE MODE`;

  await trx`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT
          1
        FROM writing_submissions
        WHERE code IS NOT NULL
          OR material_id IS NULL
          OR submission_number IS NULL
          OR estimated_level IS NULL
          OR analysis IS NULL
          OR estimated_topic IS NOT NULL
          OR estimated_genre IS NOT NULL
          OR estimated_tags IS NOT NULL
          OR analyzed_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '55000',
          MESSAGE = 'Writing rollback requires preserving submissions that cannot fit the legacy schema';
      END IF;
    END;
    $$
  `;

  await trx`DROP INDEX idx_writing_submissions_active_material_created`;
  await trx`DROP INDEX idx_writing_submissions_active_created`;

  await trx`
    ALTER TABLE writing_submissions
    DROP CONSTRAINT chk_writing_submissions_legacy_number,
    DROP CONSTRAINT chk_writing_submissions_analysis_time,
    DROP CONSTRAINT chk_writing_submissions_analysis_object,
    DROP CONSTRAINT chk_writing_submissions_original_text,
    DROP CONSTRAINT chk_writing_submissions_revision,
    DROP CONSTRAINT chk_writing_submissions_code,
    DROP CONSTRAINT uq_writing_submissions_code,
    DROP COLUMN analysis_status,
    DROP COLUMN revision,
    DROP COLUMN analyzed_at,
    DROP COLUMN estimated_tags,
    DROP COLUMN estimated_genre,
    DROP COLUMN estimated_topic,
    DROP COLUMN code,
    ALTER COLUMN analysis SET NOT NULL,
    ALTER COLUMN estimated_level SET NOT NULL,
    ALTER COLUMN submission_number SET NOT NULL,
    ALTER COLUMN material_id SET NOT NULL
  `;
};
