import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    CREATE TABLE junk_items (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT,
      category TEXT NOT NULL,
      raw_text TEXT,
      content_text TEXT,
      source_url TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}',
      search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(content_text, '')), 'B') ||
        setweight(to_tsvector('simple', category), 'C') ||
        setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'C')
      ) STORED,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE UNIQUE INDEX idx_junk_items_code
    ON junk_items (code)
  `;
  await trx`
    CREATE INDEX idx_junk_items_search
    ON junk_items USING GIN (search_vector)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_junk_items_tags
    ON junk_items USING GIN (tags)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE junk_items`;
};
