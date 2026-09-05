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
      search_vector TSVECTOR NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE FUNCTION set_notes_search_vector()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');

      RETURN NEW;
    END;
    $$
  `;
  await trx`
    CREATE TRIGGER trg_notes_search_vector
    BEFORE INSERT OR UPDATE OF title, content, tags
    ON notes
    FOR EACH ROW
    EXECUTE FUNCTION set_notes_search_vector()
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
  await trx`DROP FUNCTION set_notes_search_vector`;
  await trx`DROP TYPE note_type`;
};
