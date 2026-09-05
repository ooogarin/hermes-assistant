import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateJunkRequest,
  JunkItem,
  JunkItemRow,
  JunkSequenceRow,
  ListJunkRequest,
  UpdateJunkRequest,
} from './junk.types';

const junkCodeLockNamespace = 271_828_182;

const toJunkItem = (row: JunkItemRow): JunkItem => ({
  code: row.code,
  title: row.title,
  category: row.category,
  rawText: row.raw_text,
  contentText: row.content_text,
  sourceUrl: row.source_url,
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
    SELECT pg_advisory_xact_lock(${junkCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<JunkSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM junk_items
    WHERE code LIKE ${`JK-${dateSegment}-%`}
  `;
  const nextSequence = (row?.sequence ?? 0) + 1;

  return `JK-${dateSegment}-${String(nextSequence).padStart(3, '0')}`;
};

export const insert = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateJunkRequest,
): Promise<JunkItem> => {
  const [row] = await trx<JunkItemRow[]>`
    INSERT INTO junk_items (
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      tags
    ) VALUES (
      ${code},
      ${input.title},
      ${input.category},
      ${input.rawText},
      ${input.contentText},
      ${input.sourceUrl},
      ${trx.array(input.tags, 'TEXT')}
    )
    RETURNING
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      tags,
      created_at,
      updated_at,
      deleted_at
  `;

  if (row === undefined) {
    throw new Error('Junk item creation did not return a row.');
  }

  return toJunkItem(row);
};

export const findByCode = async (code: string): Promise<JunkItem | null> => {
  const [row] = await getDatabaseClient()<JunkItemRow[]>`
    SELECT
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      tags,
      created_at,
      updated_at,
      deleted_at
    FROM junk_items
    WHERE code = ${code}
      AND deleted_at IS NULL
  `;

  return row === undefined ? null : toJunkItem(row);
};

export const getAll = async (input: ListJunkRequest): Promise<JunkItem[]> => {
  const database = getDatabaseClient();
  const query = input.q ?? null;
  const tag = input.tag ?? null;
  const category = input.category ?? null;
  const sourceUrl = input.sourceUrl ?? null;
  const rows = await database<JunkItemRow[]>`
    SELECT
      code,
      title,
      category,
      raw_text,
      content_text,
      source_url,
      tags,
      created_at,
      updated_at,
      deleted_at
    FROM junk_items
    WHERE deleted_at IS NULL
      AND (${query}::TEXT IS NULL OR search_vector @@ websearch_to_tsquery('simple', ${query}::TEXT))
      AND (${tag}::TEXT IS NULL OR ${tag} = ANY(tags))
      AND (${category}::TEXT IS NULL OR category = ${category})
      AND (${sourceUrl}::TEXT IS NULL OR source_url = ${sourceUrl})
    ORDER BY
      CASE
        WHEN ${query}::TEXT IS NULL THEN 0
        ELSE ts_rank(search_vector, websearch_to_tsquery('simple', ${query}::TEXT))
      END DESC,
      created_at DESC
    LIMIT ${input.limit}
  `;

  return rows.map(toJunkItem);
};

export const updateByCode = async (code: string, input: UpdateJunkRequest): Promise<JunkItem | null> => {
  const database = getDatabaseClient();
  const [row] = await database<JunkItemRow[]>`
    UPDATE junk_items
    SET
      title = CASE WHEN ${input.title !== undefined} THEN ${input.title ?? null} ELSE title END,
      category = CASE WHEN ${input.category !== undefined} THEN ${input.category ?? ''} ELSE category END,
      content_text = CASE WHEN ${input.contentText !== undefined} THEN ${input.contentText ?? null} ELSE content_text END,
      source_url = CASE WHEN ${input.sourceUrl !== undefined} THEN ${input.sourceUrl ?? null} ELSE source_url END,
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
      tags,
      created_at,
      updated_at,
      deleted_at
  `;

  return row === undefined ? null : toJunkItem(row);
};

export const softDeleteByCode = async (code: string): Promise<boolean> => {
  const [row] = await getDatabaseClient()<{ code: string }[]>`
    UPDATE junk_items
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING code
  `;

  return row !== undefined;
};
