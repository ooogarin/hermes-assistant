import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateJunkPayload,
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

export const insertOne = async (
  code: string,
  input: CreateJunkPayload,
  trx: DatabaseReservedConnection,
): Promise<JunkItemRow> => {
  const [row] = await trx<JunkItemRow[]>`
    INSERT INTO junk_items (
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      source_name,
      tags
    )
    VALUES (
      ${code},
      ${input.title},
      ${input.category},
      ${input.raw_text},
      ${input.content_text},
      ${input.source_url},
      ${input.source_name},
      ${trx.array(input.tags, 'TEXT')}
    )
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
      updated_at,
      deleted_at
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
      updated_at,
      deleted_at
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
      updated_at,
      deleted_at
    FROM junk_items
    WHERE deleted_at IS NULL
      AND (
        ${query}::TEXT IS NULL
        OR search_vector @@ websearch_to_tsquery('simple', ${query}::TEXT)
        OR code = UPPER(${query}::TEXT)
        OR STRPOS(LOWER(COALESCE(source_name, '')), LOWER(${query}::TEXT)) > 0
        OR STRPOS(LOWER(COALESCE(source_url, '')), LOWER(${query}::TEXT)) > 0
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

  const [row] = await database<JunkItemRow[]>`
    UPDATE junk_items
    SET
      title = CASE WHEN ${input.title !== undefined} THEN ${input.title ?? null} ELSE title END,
      category = CASE WHEN ${input.category !== undefined} THEN ${input.category ?? ''} ELSE category END,
      content_text = CASE WHEN ${input.content_text !== undefined} THEN ${input.content_text ?? null} ELSE content_text END,
      source_url = CASE WHEN ${input.source_url !== undefined} THEN ${input.source_url ?? null} ELSE source_url END,
      source_name = CASE WHEN ${input.source_name !== undefined} THEN ${input.source_name ?? null} ELSE source_name END,
      tags = CASE WHEN ${input.tags !== undefined} THEN ${database.array(input.tags ?? [], 'TEXT')} ELSE tags END,
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
      updated_at,
      deleted_at
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
