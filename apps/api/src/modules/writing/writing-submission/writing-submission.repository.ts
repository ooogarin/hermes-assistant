import { getDatabaseClient } from '../../../core/database/client';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type {
  CreateWritingSubmissionPayload,
  ListWritingSubmissionsQuery,
  SaveWritingAnalysisPayload,
  UpdateWritingSubmissionPayload,
  WritingCountRow,
  WritingSequenceRow,
  WritingSubmissionListRow,
  WritingSubmissionRow,
} from './writing-submission.types';

const writingSubmissionLockNamespace = 223_606_797;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<WritingSequenceRow> => {
  // Serialize daily MAX + 1 allocation; include deleted rows so public codes are never reused.
  await trx`
    SELECT
      pg_advisory_xact_lock(${writingSubmissionLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<WritingSequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM writing_submissions
    WHERE code LIKE ${`WS-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Writing submission sequence query did not return a row.');
  }

  return row;
};

export const insertOne = async (
  code: string,
  input: CreateWritingSubmissionPayload,
  trx: DatabaseReservedConnection,
): Promise<WritingSubmissionRow> => {
  const [row] = await trx<WritingSubmissionRow[]>`
    INSERT INTO writing_submissions (
      code,
      material_id,
      original_text,
      word_count
    )
    VALUES (
      ${code},
      ${input.material_id},
      ${input.original_text},
      ${input.word_count}
    )
    RETURNING
      code,
      original_text,
      word_count,
      estimated_topic,
      estimated_genre,
      estimated_tags,
      estimated_level,
      analysis,
      analyzed_at,
      created_at,
      updated_at,
      ${input.material_code}::TEXT AS material_code
  `;

  if (row === undefined) {
    throw new Error('Writing submission creation did not return a row.');
  }

  return row;
};

export const getOneByCode = async (code: string): Promise<WritingSubmissionRow | null> => {
  const database = getDatabaseClient();

  // LEFT JOIN keeps free writing visible; the parent filter hides submissions under deleted materials.
  const [row] = await database<WritingSubmissionRow[]>`
    SELECT
      s.code,
      s.original_text,
      s.word_count,
      s.estimated_topic,
      s.estimated_genre,
      s.estimated_tags,
      s.estimated_level,
      s.analysis,
      s.analyzed_at,
      s.created_at,
      s.updated_at,
      m.code AS material_code
    FROM writing_submissions s
    LEFT JOIN writing_materials m ON m.id = s.material_id
    WHERE s.code = ${code} AND s.deleted_at IS NULL AND m.deleted_at IS NULL
  `;

  return row ?? null;
};

export const getOneByCodeForUpdate = async (
  code: string,
  trx: DatabaseReservedConnection,
): Promise<WritingSubmissionRow | null> => {
  // Hold the row lock through the analysis check and write so edits cannot bypass the text lock.
  const [row] = await trx<WritingSubmissionRow[]>`
    SELECT
      s.code,
      s.original_text,
      s.word_count,
      s.estimated_topic,
      s.estimated_genre,
      s.estimated_tags,
      s.estimated_level,
      s.analysis,
      s.analyzed_at,
      s.created_at,
      s.updated_at,
      m.code AS material_code
    FROM writing_submissions s
    LEFT JOIN writing_materials m ON m.id = s.material_id
    WHERE s.code = ${code} AND s.deleted_at IS NULL AND m.deleted_at IS NULL
    FOR UPDATE OF s
  `;

  return row ?? null;
};

export const updateOne = async (
  code: string,
  material_code: string | null,
  input: UpdateWritingSubmissionPayload,
  trx: DatabaseReservedConnection,
): Promise<WritingSubmissionRow> => {
  // An explicit [] clears tags; an omitted field keeps the current value.
  const tags = trx.array(input.estimated_tags ?? [], 'TEXT');

  const [row] = await trx<WritingSubmissionRow[]>`
    UPDATE writing_submissions
    SET
      original_text = COALESCE(${input.original_text}::TEXT, original_text),
      word_count = COALESCE(${input.word_count}::INTEGER, word_count),
      estimated_topic = COALESCE(${input.estimated_topic}::TEXT, estimated_topic),
      estimated_genre = COALESCE(${input.estimated_genre}::TEXT, estimated_genre),
      estimated_tags = CASE WHEN ${input.estimated_tags !== undefined} THEN ${tags} ELSE estimated_tags END,
      estimated_level = COALESCE(${input.estimated_level}::TEXT, estimated_level),
      updated_at = NOW()
    WHERE code = ${code} AND deleted_at IS NULL
    RETURNING
      code,
      original_text,
      word_count,
      estimated_topic,
      estimated_genre,
      estimated_tags,
      estimated_level,
      analysis,
      analyzed_at,
      created_at,
      updated_at,
      ${material_code}::TEXT AS material_code
  `;

  if (row === undefined) {
    throw new Error('Writing submission update did not return a row.');
  }

  return row;
};

export const updateOneAnalysis = async (
  code: string,
  material_code: string | null,
  input: SaveWritingAnalysisPayload,
  trx: DatabaseReservedConnection,
): Promise<WritingSubmissionRow> => {
  // AI fills only missing estimates; preserve manual values, including empty tags.
  const [row] = await trx<WritingSubmissionRow[]>`
    UPDATE writing_submissions
    SET
      estimated_topic = COALESCE(estimated_topic, ${input.estimated_topic}),
      estimated_genre = COALESCE(estimated_genre, ${input.estimated_genre}),
      estimated_tags = COALESCE(estimated_tags, ${trx.array(input.estimated_tags, 'TEXT')}),
      estimated_level = COALESCE(estimated_level, ${input.estimated_level}),
      analysis = ${input.analysis}::JSONB,
      analyzed_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code} AND deleted_at IS NULL
    RETURNING
      code,
      original_text,
      word_count,
      estimated_topic,
      estimated_genre,
      estimated_tags,
      estimated_level,
      analysis,
      analyzed_at,
      created_at,
      updated_at,
      ${material_code}::TEXT AS material_code
  `;

  if (row === undefined) {
    throw new Error('Writing analysis update did not return a row.');
  }

  return row;
};

export const getAll = async (input: ListWritingSubmissionsQuery): Promise<WritingSubmissionListRow[]> => {
  const database = getDatabaseClient();
  const searchPattern = toSearchPattern(input.q);
  const offset = (input.page - 1) * input.limit;

  return database<WritingSubmissionListRow[]>`
    SELECT
      s.code,
      m.code AS material_code,
      LEFT(s.original_text, 200) AS text_excerpt,
      s.word_count,
      s.estimated_topic,
      s.estimated_genre,
      s.estimated_tags,
      s.estimated_level,
      CASE WHEN s.analysis IS NULL THEN 'not_analyzed' ELSE 'analyzed' END AS analysis_status,
      s.created_at,
      s.updated_at
    FROM writing_submissions s
    LEFT JOIN writing_materials m ON m.id = s.material_id
    WHERE s.deleted_at IS NULL AND m.deleted_at IS NULL
      AND (${input.material_code}::TEXT IS NULL OR m.code = ${input.material_code})
      AND (${input.writing_type}::TEXT IS NULL
        OR (${input.writing_type}::TEXT = 'free' AND s.material_id IS NULL)
        OR (${input.writing_type}::TEXT = 'prompted' AND s.material_id IS NOT NULL))
      AND (${input.analysis_status}::TEXT IS NULL
        OR (${input.analysis_status}::TEXT = 'not_analyzed' AND s.analysis IS NULL)
        OR (${input.analysis_status}::TEXT = 'analyzed' AND s.analysis IS NOT NULL))
      AND (${searchPattern}::TEXT IS NULL OR (
        s.code ILIKE ${searchPattern}
        OR s.original_text ILIKE ${searchPattern}
        OR s.estimated_topic ILIKE ${searchPattern}
        OR s.estimated_genre ILIKE ${searchPattern}
        OR ARRAY_TO_STRING(s.estimated_tags, ' ') ILIKE ${searchPattern}
      ))
    ORDER BY
      CASE WHEN ${input.sort} = 'oldest' THEN s.created_at END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN s.created_at END DESC,
      CASE WHEN ${input.sort} = 'oldest' THEN s.id END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN s.id END DESC
    LIMIT ${input.limit}
    OFFSET ${offset}
  `;
};

export const countAll = async (input: ListWritingSubmissionsQuery): Promise<WritingCountRow> => {
  const database = getDatabaseClient();
  const searchPattern = toSearchPattern(input.q);

  const [row] = await database<WritingCountRow[]>`
    SELECT
      COUNT(*)::INTEGER AS total
    FROM writing_submissions s
    LEFT JOIN writing_materials m ON m.id = s.material_id
    WHERE s.deleted_at IS NULL AND m.deleted_at IS NULL
      AND (${input.material_code}::TEXT IS NULL OR m.code = ${input.material_code})
      AND (${input.writing_type}::TEXT IS NULL
        OR (${input.writing_type}::TEXT = 'free' AND s.material_id IS NULL)
        OR (${input.writing_type}::TEXT = 'prompted' AND s.material_id IS NOT NULL))
      AND (${input.analysis_status}::TEXT IS NULL
        OR (${input.analysis_status}::TEXT = 'not_analyzed' AND s.analysis IS NULL)
        OR (${input.analysis_status}::TEXT = 'analyzed' AND s.analysis IS NOT NULL))
      AND (${searchPattern}::TEXT IS NULL OR (
        s.code ILIKE ${searchPattern}
        OR s.original_text ILIKE ${searchPattern}
        OR s.estimated_topic ILIKE ${searchPattern}
        OR s.estimated_genre ILIKE ${searchPattern}
        OR ARRAY_TO_STRING(s.estimated_tags, ' ') ILIKE ${searchPattern}
      ))
  `;

  if (row === undefined) {
    throw new Error('Writing submission count query did not return a row.');
  }

  return row;
};

const toSearchPattern = (query: string | undefined): string | null => {
  if (query === undefined) {
    return null;
  }

  // Escape LIKE metacharacters so searches treat user input literally.
  const escapedQuery = query.replace(/[\\%_]/g, '\\$&');

  return `%${escapedQuery}%`;
};
