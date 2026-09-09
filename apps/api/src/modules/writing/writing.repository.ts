import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateWritingMaterialPayload,
  CreateWritingSubmissionPayload,
  ListWritingMaterialsQuery,
  UpdateWritingSettingsPayload,
  WritingCountRow,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSequenceRow,
  WritingSettingsRow,
  WritingSubmissionRow,
} from './writing.types';

const writingCodeLockNamespace = 173_205_080;
const writingSubmissionLockNamespace = 223_606_797;

export const getSettings = async (): Promise<WritingSettingsRow> => {
  const [row] = await getDatabaseClient()<WritingSettingsRow[]>`
    SELECT
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
    FROM writing_settings
    ORDER BY id ASC
    LIMIT 1
  `;
  if (row === undefined) {
    throw new Error('Writing settings are missing.');
  }

  return row;
};

export const updateSettings = async (input: UpdateWritingSettingsPayload): Promise<WritingSettingsRow> => {
  const [row] = await getDatabaseClient()<WritingSettingsRow[]>`
    UPDATE writing_settings
    SET
      default_level = CASE WHEN ${input.default_level !== undefined} THEN ${input.default_level ?? ''} ELSE default_level END,
      default_word_count = CASE WHEN ${input.default_word_count !== undefined} THEN ${input.default_word_count ?? 0} ELSE default_word_count END,
      min_word_count = CASE WHEN ${input.min_word_count !== undefined} THEN ${input.min_word_count ?? 0} ELSE min_word_count END,
      max_word_count = CASE WHEN ${input.max_word_count !== undefined} THEN ${input.max_word_count ?? 0} ELSE max_word_count END,
      updated_at = NOW()
    WHERE id = (SELECT id FROM writing_settings ORDER BY id ASC LIMIT 1)
    RETURNING
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
  `;
  if (row === undefined) {
    throw new Error('Writing settings are missing.');
  }

  return row;
};

export const getNextSequence = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<WritingSequenceRow> => {
  await trx`SELECT pg_advisory_xact_lock(${writingCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)`;
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

export const insertMaterial = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateWritingMaterialPayload,
  is_override: boolean,
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
      is_override,
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
      ${is_override},
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
      is_override,
      source
  `;

  if (row === undefined) {
    throw new Error('Writing material creation did not return a row.');
  }

  return row;
};

export const getMaterial = async (code: string): Promise<WritingMaterialRow | null> => {
  const [row] = await getDatabaseClient()<WritingMaterialRow[]>`
    SELECT
      code,
      topic,
      prompt_text,
      level,
      genre,
      tags,
      target_word_count,
      is_override,
      source
    FROM writing_materials
    WHERE code = ${code} AND deleted_at IS NULL
  `;
  return row === undefined ? null : row;
};

export const listMaterials = async (input: ListWritingMaterialsQuery): Promise<WritingMaterialListRow[]> => {
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
            SELECT COUNT(*)::INTEGER
            FROM writing_submissions s
            WHERE s.material_id = m.id AND s.deleted_at IS NULL
          ) AS submission_count,
          (
            SELECT MAX(s.submission_number)
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

export const countMaterials = async (input: ListWritingMaterialsQuery): Promise<WritingCountRow> => {
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
            SELECT COUNT(*)::INTEGER
            FROM writing_submissions s
            WHERE s.material_id = m.id AND s.deleted_at IS NULL
          ) AS submission_count
        FROM writing_materials m
        WHERE m.deleted_at IS NULL
      )
      SELECT COUNT(*)::INTEGER AS total
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

export const insertSubmission = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateWritingSubmissionPayload,
  word_count: number,
): Promise<WritingSubmissionRow | null> => {
  // Submission numbers are scoped to a material, so serialize the MAX + 1 lookup for the same code.
  await trx`
    SELECT pg_advisory_xact_lock(${writingSubmissionLockNamespace}::INTEGER, hashtext(${code}))
  `;

  const [row] = await trx<WritingSubmissionRow[]>`
    WITH target AS (
      SELECT id FROM writing_materials WHERE code = ${code} AND deleted_at IS NULL
    ), next_submission AS (
      SELECT COALESCE(MAX(submission_number), 0) + 1 AS submission_number
      FROM writing_submissions
      WHERE material_id = (SELECT id FROM target)
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

export const getSubmission = async (code: string, submission_number: number): Promise<WritingSubmissionRow | null> => {
  const [row] = await getDatabaseClient()<WritingSubmissionRow[]>`
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
