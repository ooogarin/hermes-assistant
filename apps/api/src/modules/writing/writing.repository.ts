import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateWritingMaterialRequest,
  CreateWritingSubmissionRequest,
  ListWritingMaterialsRequest,
  UpdateWritingSettingsRequest,
  WritingCountRow,
  WritingMaterial,
  WritingMaterialList,
  WritingMaterialListItem,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSettings,
  WritingSettingsRow,
  WritingSubmission,
  WritingSubmissionRow,
} from './writing.types';

const writingCodeLockNamespace = 173_205_080;
const writingSubmissionLockNamespace = 223_606_797;

const toWritingSettings = (row: WritingSettingsRow): WritingSettings => ({
  defaultLevel: row.default_level,
  defaultWordCount: row.default_word_count,
  minWordCount: row.min_word_count,
  maxWordCount: row.max_word_count,
  updatedAt: toIsoTimestamp(row.updated_at),
});

const toWritingMaterial = (row: WritingMaterialRow): WritingMaterial => ({
  code: row.code,
  topic: row.topic,
  promptText: row.prompt_text,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  targetWordCount: row.target_word_count,
  isOverride: row.is_override,
  source: row.source,
});

const toWritingSubmission = (row: WritingSubmissionRow): WritingSubmission => ({
  submissionNumber: row.submission_number,
  originalText: row.original_text,
  wordCount: row.word_count,
  estimatedLevel: row.estimated_level,
  analysis: row.analysis,
  submittedAt: toIsoTimestamp(row.submitted_at),
});

const toWritingMaterialListItem = (row: WritingMaterialListRow): WritingMaterialListItem => ({
  code: row.code,
  topic: row.topic,
  promptExcerpt: row.prompt_excerpt,
  genre: row.genre,
  level: row.level,
  targetWordCount: row.target_word_count,
  tags: row.tags,
  source: row.source,
  status: row.status,
  submissionCount: Number(row.submission_count),
  latestSubmissionNumber: row.latest_submission_number === null ? null : Number(row.latest_submission_number),
  createdAt: toIsoTimestamp(row.created_at),
});

export const getSettings = async (): Promise<WritingSettings> => {
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

  return toWritingSettings(row);
};

export const updateSettings = async (input: UpdateWritingSettingsRequest): Promise<WritingSettings> => {
  const [row] = await getDatabaseClient()<WritingSettingsRow[]>`
    UPDATE writing_settings
    SET
      default_level = CASE WHEN ${input.defaultLevel !== undefined} THEN ${input.defaultLevel ?? ''} ELSE default_level END,
      default_word_count = CASE WHEN ${input.defaultWordCount !== undefined} THEN ${input.defaultWordCount ?? 0} ELSE default_word_count END,
      min_word_count = CASE WHEN ${input.minWordCount !== undefined} THEN ${input.minWordCount ?? 0} ELSE min_word_count END,
      max_word_count = CASE WHEN ${input.maxWordCount !== undefined} THEN ${input.maxWordCount ?? 0} ELSE max_word_count END,
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

  return toWritingSettings(row);
};

export const generateCode = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<string> => {
  await trx`SELECT pg_advisory_xact_lock(${writingCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)`;
  const [row] = await trx<{ sequence: number }[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM writing_materials
    WHERE code LIKE ${`WR-${dateSegment}-%`}
  `;
  return `WR-${dateSegment}-${String((row?.sequence ?? 0) + 1).padStart(3, '0')}`;
};

export const insertMaterial = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateWritingMaterialRequest,
  isOverride: boolean,
): Promise<void> => {
  await trx`
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
      ${input.promptText},
      ${input.level},
      ${input.genre},
      ${trx.array(input.tags, 'TEXT')},
      ${input.targetWordCount},
      ${isOverride},
      ${input.source}::writing_source
    )
  `;
};

export const getMaterial = async (code: string): Promise<WritingMaterial | null> => {
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
  return row === undefined ? null : toWritingMaterial(row);
};

export const listMaterials = async (input: ListWritingMaterialsRequest): Promise<WritingMaterialList> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const offset = (input.page - 1) * input.limit;
  const [rows, [count]] = await Promise.all([
    database<WritingMaterialListRow[]>`
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
        CASE
          WHEN CHAR_LENGTH(prompt_text) > 200 THEN LEFT(prompt_text, 197) || '...'
          ELSE prompt_text
        END AS prompt_excerpt,
        genre,
        level,
        target_word_count,
        tags,
        source,
        CASE WHEN submission_count > 0 THEN 'reviewed' ELSE 'unsubmitted' END AS status,
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
        AND (${input.level}::TEXT IS NULL OR level = ${input.level})
        AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
        AND (${input.status}::TEXT IS NULL OR CASE WHEN submission_count > 0 THEN 'reviewed' ELSE 'unsubmitted' END = ${input.status})
      ORDER BY
        CASE WHEN ${input.sort} = 'oldest' THEN created_at END ASC,
        CASE WHEN ${input.sort} = 'newest' THEN created_at END DESC,
        CASE WHEN ${input.sort} = 'oldest' THEN id END ASC,
        CASE WHEN ${input.sort} = 'newest' THEN id END DESC
      LIMIT ${input.limit}
      OFFSET ${offset}
    `,
    database<WritingCountRow[]>`
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
        AND (${input.level}::TEXT IS NULL OR level = ${input.level})
        AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
        AND (${input.status}::TEXT IS NULL OR CASE WHEN submission_count > 0 THEN 'reviewed' ELSE 'unsubmitted' END = ${input.status})
    `,
  ]);
  const total = Number(count?.total ?? 0);

  return {
    items: rows.map(toWritingMaterialListItem),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
};

export const insertSubmission = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateWritingSubmissionRequest,
  wordCount: number,
): Promise<WritingSubmission | null> => {
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
      ${input.originalText},
      ${wordCount},
      ${input.estimatedLevel},
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
  return row === undefined ? null : toWritingSubmission(row);
};

export const getSubmission = async (code: string, submissionNumber: number): Promise<WritingSubmission | null> => {
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
    WHERE m.code = ${code} AND m.deleted_at IS NULL AND s.submission_number = ${submissionNumber} AND s.deleted_at IS NULL
  `;
  return row === undefined ? null : toWritingSubmission(row);
};
