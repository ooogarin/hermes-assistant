import { getDatabaseClient } from '../../../core/database/client';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type {
  CreateWritingMaterialPayload,
  ListWritingMaterialsQuery,
  WritingCountRow,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSequenceRow,
} from './writing-material.types';

const writingCodeLockNamespace = 173_205_080;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<WritingSequenceRow> => {
  // Serialize daily MAX + 1 allocation; include deleted rows so public codes are never reused.
  await trx`
    SELECT
      pg_advisory_xact_lock(${writingCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<WritingSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM writing_materials
    WHERE code LIKE ${`WR-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Writing sequence query did not return a row.');
  }

  return row;
};

export const insertOne = async (
  code: string,
  input: CreateWritingMaterialPayload,
  trx: DatabaseReservedConnection,
): Promise<WritingMaterialRow> => {
  const [row] = await trx<WritingMaterialRow[]>`
    INSERT INTO writing_materials (
      code,
      topic,
      prompt_text,
      level,
      genre,
      tags,
      target_word_count,
      source
    )
    VALUES (
      ${code},
      ${input.topic},
      ${input.prompt_text},
      ${input.level},
      ${input.genre},
      ${trx.array(input.tags, 'TEXT')},
      ${input.target_word_count},
      ${input.source}::writing_source
    )
    RETURNING
      id,
      code,
      topic,
      prompt_text,
      level,
      genre,
      tags,
      target_word_count,
      source
  `;

  if (row === undefined) {
    throw new Error('Writing material creation did not return a row.');
  }

  return row;
};

export const getOneByCode = async (
  code: string,
  trx?: DatabaseReservedConnection,
): Promise<WritingMaterialRow | null> => {
  const database = trx ?? getDatabaseClient();

  const [row] = await database<WritingMaterialRow[]>`
    SELECT
      id,
      code,
      topic,
      prompt_text,
      level,
      genre,
      tags,
      target_word_count,
      source
    FROM writing_materials
    WHERE code = ${code} AND deleted_at IS NULL
  `;

  return row === undefined ? null : row;
};

export const getAll = async (input: ListWritingMaterialsQuery): Promise<WritingMaterialListRow[]> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const offset = (input.page - 1) * input.limit;
  const levels = input.levels ?? null;
  const levelValues = database.array(levels ?? [], 'TEXT');

  return database<WritingMaterialListRow[]>`
    WITH material_summary AS (
      SELECT
        m.id,
        m.code,
        m.topic,
        m.prompt_text,
        m.genre,
        m.level,
        m.target_word_count,
        m.tags,
        m.source,
        m.created_at,
        (
          SELECT
            COUNT(*)::INTEGER
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL
        ) AS submission_count,
        (
          SELECT
            COUNT(*)::INTEGER
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL AND s.analysis IS NOT NULL
        ) AS analyzed_submission_count,
        (
          SELECT
            s.code
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL
          ORDER BY
            s.created_at DESC,
            s.id DESC
          LIMIT 1
        ) AS latest_submission_code
      FROM writing_materials m
      WHERE m.deleted_at IS NULL
    )
    SELECT
      code,
      topic,
      prompt_text,
      genre,
      level,
      target_word_count,
      tags,
      source,
      submission_count,
      analyzed_submission_count,
      latest_submission_code,
      created_at
    FROM material_summary
    WHERE (${searchPattern}::TEXT IS NULL OR (
      topic ILIKE ${searchPattern}
      OR prompt_text ILIKE ${searchPattern}
      OR genre ILIKE ${searchPattern}
      OR code ILIKE ${searchPattern}
      OR ARRAY_TO_STRING(tags, ' ') ILIKE ${searchPattern}
    ))
      AND (${levels === null} OR level = ANY(${levelValues}))
      AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
      AND (
        ${input.status}::TEXT IS NULL
        OR (${input.status}::TEXT = 'reviewed' AND analyzed_submission_count > 0)
        OR (${input.status}::TEXT = 'submitted' AND submission_count > 0 AND analyzed_submission_count = 0)
        OR (${input.status}::TEXT = 'unsubmitted' AND submission_count = 0)
      )
    ORDER BY
      CASE WHEN ${input.sort} = 'oldest' THEN created_at END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN created_at END DESC,
      CASE WHEN ${input.sort} = 'oldest' THEN id END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN id END DESC
    LIMIT ${input.limit}
    OFFSET ${offset}
  `;
};

export const countAll = async (input: ListWritingMaterialsQuery): Promise<WritingCountRow> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const levels = input.levels ?? null;
  const levelValues = database.array(levels ?? [], 'TEXT');

  const [count] = await database<WritingCountRow[]>`
    WITH material_summary AS (
      SELECT
        m.id,
        m.code,
        m.topic,
        m.prompt_text,
        m.genre,
        m.level,
        m.tags,
        (
          SELECT
            COUNT(*)::INTEGER
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL
        ) AS submission_count,
        (
          SELECT
            COUNT(*)::INTEGER
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL AND s.analysis IS NOT NULL
        ) AS analyzed_submission_count
      FROM writing_materials m
      WHERE m.deleted_at IS NULL
    )
    SELECT
      COUNT(*)::INTEGER AS total
    FROM material_summary
    WHERE (${searchPattern}::TEXT IS NULL OR (
      topic ILIKE ${searchPattern}
      OR prompt_text ILIKE ${searchPattern}
      OR genre ILIKE ${searchPattern}
      OR code ILIKE ${searchPattern}
      OR ARRAY_TO_STRING(tags, ' ') ILIKE ${searchPattern}
    ))
      AND (${levels === null} OR level = ANY(${levelValues}))
      AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
      AND (
        ${input.status}::TEXT IS NULL
        OR (${input.status}::TEXT = 'reviewed' AND analyzed_submission_count > 0)
        OR (${input.status}::TEXT = 'submitted' AND submission_count > 0 AND analyzed_submission_count = 0)
        OR (${input.status}::TEXT = 'unsubmitted' AND submission_count = 0)
      )
  `;

  if (count === undefined) {
    throw new Error('Writing material count query did not return a row.');
  }

  return count;
};
