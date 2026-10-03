import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateWritingMaterialPayload,
  CreateWritingSubmissionPayload,
  ListWritingMaterialsQuery,
  WritingCountRow,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSequenceRow,
  WritingSubmissionRow,
} from './writing.types';

const writingCodeLockNamespace = 173_205_080;
const writingSubmissionLockNamespace = 223_606_797;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<WritingSequenceRow> => {
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

export const getOneByCode = async (code: string): Promise<WritingMaterialRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<WritingMaterialRow[]>`
    SELECT
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
            MAX(s.submission_number)
          FROM writing_submissions s
          WHERE s.material_id = m.id AND s.deleted_at IS NULL
        ) AS latest_submission_number
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
      latest_submission_number,
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
        OR (${input.status}::TEXT = 'reviewed' AND submission_count > 0)
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
        ) AS submission_count
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
        OR (${input.status}::TEXT = 'reviewed' AND submission_count > 0)
        OR (${input.status}::TEXT = 'unsubmitted' AND submission_count = 0)
      )
  `;

  if (count === undefined) {
    throw new Error('Writing material count query did not return a row.');
  }

  return count;
};

export const insertOneSubmissionByCode = async (
  code: string,
  input: CreateWritingSubmissionPayload,
  word_count: number,
  trx: DatabaseReservedConnection,
): Promise<WritingSubmissionRow | null> => {
  // Submission numbers are scoped to a material, so serialize the MAX + 1 lookup for the same code.
  await trx`
    SELECT
      pg_advisory_xact_lock(${writingSubmissionLockNamespace}::INTEGER, hashtext(${code}))
  `;

  const [row] = await trx<WritingSubmissionRow[]>`
    WITH target AS (
      SELECT
        id
      FROM writing_materials
      WHERE code = ${code}
        AND deleted_at IS NULL
    ), next_submission AS (
      SELECT
        COALESCE(MAX(submission_number), 0) + 1 AS submission_number
      FROM writing_submissions
      WHERE material_id = (
        SELECT
          id
        FROM target
      )
    )
    INSERT INTO writing_submissions (
      material_id,
      submission_number,
      original_text,
      word_count,
      estimated_level,
      analysis
    )
    SELECT
      target.id,
      next_submission.submission_number,
      ${input.original_text},
      ${word_count},
      ${input.estimated_level},
      ${JSON.stringify(input.analysis)}::JSONB
    FROM target, next_submission
    RETURNING
      submission_number,
      original_text,
      word_count,
      estimated_level,
      analysis,
      submitted_at
  `;

  return row === undefined ? null : row;
};

export const getOneSubmissionByCodeAndNumber = async (
  code: string,
  submission_number: number,
): Promise<WritingSubmissionRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<WritingSubmissionRow[]>`
    SELECT
      s.submission_number,
      s.original_text,
      s.word_count,
      s.estimated_level,
      s.analysis,
      s.submitted_at
    FROM writing_submissions s
    JOIN writing_materials m ON m.id = s.material_id
    WHERE m.code = ${code} AND m.deleted_at IS NULL AND s.submission_number = ${submission_number} AND s.deleted_at IS NULL
  `;

  return row === undefined ? null : row;
};
