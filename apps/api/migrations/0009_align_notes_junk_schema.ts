import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`ALTER TABLE notes RENAME COLUMN content TO content_text`;
  await trx`ALTER TABLE notes RENAME COLUMN source TO source_name`;
  await trx`
    ALTER TABLE notes
    ADD COLUMN raw_text TEXT,
    ADD COLUMN source_url TEXT,
    ADD CONSTRAINT chk_notes_source_name
      CHECK (source_name IS NULL OR char_length(btrim(source_name)) BETWEEN 1 AND 200)
  `;
  await trx`
    CREATE OR REPLACE FUNCTION set_notes_search_vector()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content_text, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');

      RETURN NEW;
    END;
    $$
  `;
  await trx`DROP TRIGGER trg_notes_search_vector ON notes`;
  await trx`
    CREATE TRIGGER trg_notes_search_vector
    BEFORE INSERT OR UPDATE OF title, content_text, category, tags
    ON notes
    FOR EACH ROW
    EXECUTE FUNCTION set_notes_search_vector()
  `;
  await trx`
    ALTER TABLE junk_items
    ADD CONSTRAINT chk_junk_items_has_content
      CHECK (
        NULLIF(btrim(title), '') IS NOT NULL
        OR NULLIF(btrim(raw_text), '') IS NOT NULL
        OR NULLIF(btrim(content_text), '') IS NOT NULL
        OR NULLIF(btrim(source_url), '') IS NOT NULL
      )
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`ALTER TABLE junk_items DROP CONSTRAINT chk_junk_items_has_content`;
  await trx`DROP TRIGGER trg_notes_search_vector ON notes`;
  await trx`ALTER TABLE notes DROP CONSTRAINT chk_notes_source_name`;
  await trx`ALTER TABLE notes DROP COLUMN raw_text, DROP COLUMN source_url`;
  await trx`ALTER TABLE notes RENAME COLUMN content_text TO content`;
  await trx`ALTER TABLE notes RENAME COLUMN source_name TO source`;
  await trx`
    CREATE OR REPLACE FUNCTION set_notes_search_vector()
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
};
