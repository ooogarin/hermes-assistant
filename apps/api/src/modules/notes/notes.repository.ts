import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateNotePayload,
  ListNotesRepositoryQuery,
  NoteRow,
  NoteSequenceRow,
  UpdateNotePayload,
} from './notes.types';

const noteCodeLockNamespace = 314_159_265;

export const getNextSequence = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<NoteSequenceRow> => {
  await trx`
    SELECT pg_advisory_xact_lock(${noteCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
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

export const insert = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateNotePayload,
): Promise<NoteRow> => {
  const [row] = await trx<NoteRow[]>`
    INSERT INTO notes (
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
      tags
    ) VALUES (
      ${code},
      ${input.title},
      ${input.content_text},
      ${input.raw_text},
      ${input.type}::note_type,
      ${input.category},
      ${input.source_name},
      ${input.source_url},
      ${input.source_context},
      ${input.source_reference},
      ${trx.array(input.tags, 'TEXT')}
    )
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
      updated_at,
      deleted_at
  `;

  if (row === undefined) {
    throw new Error('Note creation did not return a row.');
  }

  return row;
};

export const findByCode = async (code: string): Promise<NoteRow | null> => {
  const [row] = await getDatabaseClient()<NoteRow[]>`
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
      updated_at,
      deleted_at
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
      updated_at,
      deleted_at
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

export const updateByCode = async (code: string, input: UpdateNotePayload): Promise<NoteRow | null> => {
  const database = getDatabaseClient();
  const [row] = await database<NoteRow[]>`
    UPDATE notes
    SET
      title = CASE WHEN ${input.title !== undefined} THEN ${input.title ?? ''} ELSE title END,
      content_text = CASE WHEN ${input.content_text !== undefined} THEN ${input.content_text ?? ''} ELSE content_text END,
      type = CASE WHEN ${input.type !== undefined} THEN ${input.type ?? 'fact'}::note_type ELSE type END,
      category = CASE WHEN ${input.category !== undefined} THEN ${input.category ?? ''} ELSE category END,
      source_name = CASE WHEN ${input.source_name !== undefined} THEN ${input.source_name ?? null} ELSE source_name END,
      source_url = CASE WHEN ${input.source_url !== undefined} THEN ${input.source_url ?? null} ELSE source_url END,
      source_context = CASE WHEN ${input.source_context !== undefined} THEN ${input.source_context ?? null} ELSE source_context END,
      source_reference = CASE
        WHEN ${input.source_reference !== undefined} THEN ${input.source_reference ?? null}
        ELSE source_reference
      END,
      tags = CASE WHEN ${input.tags !== undefined} THEN ${database.array(input.tags ?? [], 'TEXT')} ELSE tags END,
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
      updated_at,
      deleted_at
  `;

  return row === undefined ? null : row;
};

export const softDeleteByCode = async (code: string): Promise<{ code: string } | null> => {
  const [row] = await getDatabaseClient()<{ code: string }[]>`
    UPDATE notes
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING code
  `;

  return row ?? null;
};
