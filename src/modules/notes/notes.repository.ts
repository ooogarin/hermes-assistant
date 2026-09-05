import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateNoteRequest,
  ListNotesRequest,
  Note,
  NoteRow,
  NoteSequenceRow,
  UpdateNoteRequest,
} from './notes.types';

const noteCodeLockNamespace = 314_159_265;

const toNote = (row: NoteRow): Note => ({
  code: row.code,
  title: row.title,
  content: row.content,
  type: row.type,
  category: row.category,
  source: row.source,
  sourceContext: row.source_context,
  sourceReference: row.source_reference,
  tags: row.tags,
  createdAt: toIsoTimestamp(row.created_at),
  updatedAt: toIsoTimestamp(row.updated_at),
  deletedAt: row.deleted_at === null ? null : toIsoTimestamp(row.deleted_at),
});

export const generateCode = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<string> => {
  await trx`
    SELECT pg_advisory_xact_lock(${noteCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<NoteSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM notes
    WHERE code LIKE ${`NT-${dateSegment}-%`}
  `;
  const nextSequence = (row?.sequence ?? 0) + 1;

  return `NT-${dateSegment}-${String(nextSequence).padStart(3, '0')}`;
};

export const insert = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateNoteRequest,
): Promise<Note> => {
  const [row] = await trx<NoteRow[]>`
    INSERT INTO notes (
      code,
      title,
      content,
      type,
      category,
      source,
      source_context,
      source_reference,
      tags
    ) VALUES (
      ${code},
      ${input.title},
      ${input.content},
      ${input.type}::note_type,
      ${input.category},
      ${input.source},
      ${input.sourceContext},
      ${input.sourceReference},
      ${trx.array(input.tags, 'TEXT')}
    )
    RETURNING
      code,
      title,
      content,
      type,
      category,
      source,
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

  return toNote(row);
};

export const findByCode = async (code: string): Promise<Note | null> => {
  const [row] = await getDatabaseClient()<NoteRow[]>`
    SELECT
      code,
      title,
      content,
      type,
      category,
      source,
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

  return row === undefined ? null : toNote(row);
};

export const getAll = async (input: ListNotesRequest): Promise<Note[]> => {
  const database = getDatabaseClient();
  const query = input.q ?? null;
  const tag = input.tag ?? null;
  const category = input.category ?? null;
  const rows = await database<NoteRow[]>`
    SELECT
      code,
      title,
      content,
      type,
      category,
      source,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at,
      deleted_at
    FROM notes
    WHERE deleted_at IS NULL
      AND (${query}::TEXT IS NULL OR search_vector @@ websearch_to_tsquery('simple', ${query}::TEXT))
      AND (${tag}::TEXT IS NULL OR ${tag} = ANY(tags))
      AND (${category}::TEXT IS NULL OR category = ${category})
    ORDER BY
      CASE
        WHEN ${query}::TEXT IS NULL THEN 0
        ELSE ts_rank(search_vector, websearch_to_tsquery('simple', ${query}::TEXT))
      END DESC,
      created_at DESC
    LIMIT ${input.limit}
  `;

  return rows.map(toNote);
};

export const updateByCode = async (code: string, input: UpdateNoteRequest): Promise<Note | null> => {
  const database = getDatabaseClient();
  const [row] = await database<NoteRow[]>`
    UPDATE notes
    SET
      title = CASE WHEN ${input.title !== undefined} THEN ${input.title ?? ''} ELSE title END,
      content = CASE WHEN ${input.content !== undefined} THEN ${input.content ?? ''} ELSE content END,
      type = CASE WHEN ${input.type !== undefined} THEN ${input.type ?? 'fact'}::note_type ELSE type END,
      category = CASE WHEN ${input.category !== undefined} THEN ${input.category ?? ''} ELSE category END,
      source = CASE WHEN ${input.source !== undefined} THEN ${input.source ?? null} ELSE source END,
      source_context = CASE WHEN ${input.sourceContext !== undefined} THEN ${input.sourceContext ?? null} ELSE source_context END,
      source_reference = CASE
        WHEN ${input.sourceReference !== undefined} THEN ${input.sourceReference ?? null}
        ELSE source_reference
      END,
      tags = CASE WHEN ${input.tags !== undefined} THEN ${database.array(input.tags ?? [], 'TEXT')} ELSE tags END,
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      code,
      title,
      content,
      type,
      category,
      source,
      source_context,
      source_reference,
      tags,
      created_at,
      updated_at,
      deleted_at
  `;

  return row === undefined ? null : toNote(row);
};

export const softDeleteByCode = async (code: string): Promise<boolean> => {
  const [row] = await getDatabaseClient()<{ code: string }[]>`
    UPDATE notes
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING code
  `;

  return row !== undefined;
};
