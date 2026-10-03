import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  // Writing data is assumed empty; this migration only changes the schema.
  await trx`DROP INDEX idx_writing_submissions_material`;

  await trx`
    ALTER TABLE writing_submissions
    ALTER COLUMN material_id DROP NOT NULL,
    DROP COLUMN submission_number,
    DROP COLUMN submitted_at,
    ALTER COLUMN estimated_level DROP NOT NULL,
    ALTER COLUMN analysis DROP NOT NULL,
    ADD COLUMN code TEXT NOT NULL,
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
      CHECK (code ~ '^WS-[0-9]{8}-[0-9]{3,}$'),
    ADD CONSTRAINT chk_writing_submissions_revision CHECK (revision > 0),
    ADD CONSTRAINT chk_writing_submissions_original_text
      CHECK (original_text ~ '[^[:space:]]'),
    ADD CONSTRAINT chk_writing_submissions_analysis_object
      CHECK (analysis IS NULL OR JSONB_TYPEOF(analysis) = 'object'),
    ADD CONSTRAINT chk_writing_submissions_analysis_time
      CHECK (
        (analysis IS NULL AND analyzed_at IS NULL)
        OR (analysis IS NOT NULL AND analyzed_at IS NOT NULL)
      )
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
  // Rollback restores removed columns only while the submissions table is empty.
  await trx`LOCK TABLE writing_submissions IN ACCESS EXCLUSIVE MODE`;

  const rows = await trx<Array<{ id: number }>>`
    SELECT
      id
    FROM writing_submissions
    LIMIT 1
  `;

  if (rows.length > 0) {
    throw new Error('Writing rollback requires an empty writing_submissions table.');
  }

  await trx`DROP INDEX idx_writing_submissions_active_material_created`;
  await trx`DROP INDEX idx_writing_submissions_active_created`;

  await trx`
    ALTER TABLE writing_submissions
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
    ALTER COLUMN material_id SET NOT NULL,
    ADD COLUMN submission_number INTEGER NOT NULL CHECK (submission_number > 0),
    ADD COLUMN submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD UNIQUE (material_id, submission_number)
  `;

  await trx`
    CREATE INDEX idx_writing_submissions_material
    ON writing_submissions (material_id, submission_number)
    WHERE deleted_at IS NULL
  `;
};
