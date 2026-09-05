import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    CREATE TYPE note_type AS ENUM ('fact', 'personal', 'news', 'quote', 'idea', 'reminder')
  `;
  await trx`
    CREATE TABLE notes (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type note_type NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      source_context TEXT,
      source_reference TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}',
      search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(content, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'C')
      ) STORED,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE UNIQUE INDEX idx_notes_code
    ON notes (code)
  `;
  await trx`
    CREATE INDEX idx_notes_search
    ON notes USING GIN (search_vector)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_notes_tags
    ON notes USING GIN (tags)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE notes`;
  await trx`DROP TYPE note_type`;
};
