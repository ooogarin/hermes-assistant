import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  InsertNotePayload,
  ListNotesRepositoryQuery,
  NoteRow,
  NoteSequenceRow,
  UpdateNotePayload,
} from './notes.types';

const noteCodeLockNamespace = 314_159_265;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<NoteSequenceRow> => {
  await trx`
    SELECT
      pg_advisory_xact_lock(${noteCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<NoteSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM notes
    WHERE code LIKE ${`NT-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Note sequence query did not return a row.');
  }

  return row;
};

export const insert = async (payload: InsertNotePayload, trx: DatabaseReservedConnection): Promise<NoteRow> => {
  const allowedColumns = [
    'code',
    'title',
    'content_text',
    'raw_text',
    'type',
    'category',
    'source_name',
    'source_url',
    'source_context',
    'source_reference',
    'tags',
  ] as const;

  const insertInput = { ...payload, tags: trx.array(payload.tags, 'TEXT') };

  const [row] = await trx<NoteRow[]>`
    INSERT INTO notes ${trx(insertInput, ...allowedColumns)}
    RETURNING
      code,
      title,
      content_text,
      raw_text,
      type,
      category,
      source_name,
      source_url,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Note creation did not return a row.');
  }

  return row;
};

export const getOneByCode = async (code: string): Promise<NoteRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<NoteRow[]>`
    SELECT
      code,
      title,
      content_text,
      raw_text,
      type,
      category,
      source_name,
      source_url,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at
    FROM notes
    WHERE code = ${code}
      AND deleted_at IS NULL
  `;

  return row === undefined ? null : row;
};

export const getAll = async (input: ListNotesRepositoryQuery): Promise<NoteRow[]> => {
  const database = getDatabaseClient();
  const query = input.q ?? null;
  const type = input.type ?? null;
  const tag = input.tag ?? null;
  const category = input.category ?? null;
  const source = input.source ?? null;
  const from = input.from ?? null;
  const to = input.to ?? null;

  const rows = await database<NoteRow[]>`
    SELECT
      code,
      title,
      content_text,
      raw_text,
      type,
      category,
      source_name,
      source_url,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at
    FROM notes
    WHERE deleted_at IS NULL
      AND (
        ${query}::TEXT IS NULL
        OR search_vector @@ websearch_to_tsquery('simple', ${query}::TEXT)
        OR code = UPPER(${query}::TEXT)
        OR STRPOS(LOWER(COALESCE(source_name, '')), LOWER(${query}::TEXT)) > 0
        OR STRPOS(LOWER(COALESCE(source_url, '')), LOWER(${query}::TEXT)) > 0
        OR STRPOS(LOWER(category), LOWER(${query}::TEXT)) > 0
      )
      AND (${type}::note_type IS NULL OR type = ${type}::note_type)
      AND (${tag}::TEXT IS NULL OR ${tag} = ANY(tags))
      AND (${category}::TEXT IS NULL OR category = ${category})
      AND (
        ${source}::TEXT IS NULL
        OR STRPOS(LOWER(COALESCE(source_name, '')), LOWER(${source}::TEXT)) > 0
        OR STRPOS(LOWER(COALESCE(source_url, '')), LOWER(${source}::TEXT)) > 0
      )
      AND (${from}::DATE IS NULL OR created_at >= (${from}::DATE AT TIME ZONE 'Asia/Jakarta'))
      AND (${to}::DATE IS NULL OR created_at < ((${to}::DATE + 1) AT TIME ZONE 'Asia/Jakarta'))
    ORDER BY
      CASE WHEN ${input.sort}::TEXT = 'newest' THEN created_at END DESC,
      CASE WHEN ${input.sort}::TEXT = 'oldest' THEN created_at END ASC,
      code DESC
    LIMIT ${input.limit}
  `;

  return rows;
};

// A repository method that later needs an explicit transaction takes a required
// `trx: DatabaseReservedConnection` as its final parameter and runs through it directly.
export const updateOneByCode = async (code: string, input: UpdateNotePayload): Promise<NoteRow | null> => {
  const database = getDatabaseClient();

  const allowedColumns = [
    'title',
    'content_text',
    'type',
    'category',
    'source_name',
    'source_url',
    'source_context',
    'source_reference',
    'tags',
  ] as const;

  const updateInput = { ...input, tags: input.tags === undefined ? undefined : database.array(input.tags, 'TEXT') };

  const [row] = await database<NoteRow[]>`
    UPDATE notes
    SET
      ${database(updateInput, ...allowedColumns)},
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      code,
      title,
      content_text,
      raw_text,
      type,
      category,
      source_name,
      source_url,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at
  `;

  return row === undefined ? null : row;
};

export const softDeleteOneByCode = async (code: string): Promise<{ code: string } | null> => {
  const database = getDatabaseClient();

  const [row] = await database<{ code: string }[]>`
    UPDATE notes
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      code
  `;

  return row ?? null;
};
