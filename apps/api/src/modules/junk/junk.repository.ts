import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  InsertJunkPayload,
  JunkItemRow,
  JunkSequenceRow,
  ListJunkRepositoryQuery,
  UpdateJunkPayload,
} from './junk.types';

const junkCodeLockNamespace = 271_828_182;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<JunkSequenceRow> => {
  await trx`
    SELECT
      pg_advisory_xact_lock(${junkCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<JunkSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM junk_items
    WHERE code LIKE ${`JK-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Junk sequence query did not return a row.');
  }

  return row;
};

export const insert = async (payload: InsertJunkPayload, trx: DatabaseReservedConnection): Promise<JunkItemRow> => {
  const allowedColumns = [
    'code',
    'title',
    'category',
    'raw_text',
    'content_text',
    'source_url',
    'source_name',
    'tags',
  ] as const;

  const insertInput = { ...payload, tags: trx.array(payload.tags, 'TEXT') };

  const [row] = await trx<JunkItemRow[]>`
    INSERT INTO junk_items ${trx(insertInput, ...allowedColumns)}
    RETURNING
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      source_name,
      tags,
      created_at,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Junk item creation did not return a row.');
  }

  return row;
};

export const getOneByCode = async (code: string): Promise<JunkItemRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<JunkItemRow[]>`
    SELECT
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      source_name,
      tags,
      created_at,
      updated_at
    FROM junk_items
    WHERE code = ${code}
      AND deleted_at IS NULL
  `;

  return row === undefined ? null : row;
};

export const getAll = async (input: ListJunkRepositoryQuery): Promise<JunkItemRow[]> => {
  const database = getDatabaseClient();
  const query = input.q ?? null;
  const tag = input.tag ?? null;
  const category = input.category ?? null;
  const source_url = input.source_url ?? null;
  const source = input.source ?? null;
  const from = input.from ?? null;
  const to = input.to ?? null;

  const rows = await database<JunkItemRow[]>`
    SELECT
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      source_name,
      tags,
      created_at,
      updated_at
    FROM junk_items
    WHERE deleted_at IS NULL
      AND (
        ${query}::TEXT IS NULL
        OR search_vector @@ websearch_to_tsquery('simple', ${query}::TEXT)
        OR code = UPPER(${query}::TEXT)
        OR STRPOS(LOWER(COALESCE(source_name, '')), LOWER(${query}::TEXT)) > 0
        OR STRPOS(LOWER(COALESCE(source_url, '')), LOWER(${query}::TEXT)) > 0
        OR STRPOS(LOWER(category), LOWER(${query}::TEXT)) > 0
      )
      AND (${tag}::TEXT IS NULL OR ${tag} = ANY(tags))
      AND (${category}::TEXT IS NULL OR category = ${category})
      AND (${source_url}::TEXT IS NULL OR source_url = ${source_url})
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

export const updateOneByCode = async (code: string, input: UpdateJunkPayload): Promise<JunkItemRow | null> => {
  const database = getDatabaseClient();

  const allowedColumns = ['title', 'category', 'content_text', 'source_url', 'source_name', 'tags'] as const;

  const updateInput = { ...input, tags: input.tags === undefined ? undefined : database.array(input.tags, 'TEXT') };

  const [row] = await database<JunkItemRow[]>`
    UPDATE junk_items
    SET
      ${database(updateInput, ...allowedColumns)},
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      source_name,
      tags,
      created_at,
      updated_at
  `;

  return row === undefined ? null : row;
};

export const softDeleteOneByCode = async (code: string): Promise<{ code: string } | null> => {
  const database = getDatabaseClient();

  const [row] = await database<{ code: string }[]>`
    UPDATE junk_items
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
