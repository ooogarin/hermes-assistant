import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  IdRow,
  InsertReadingMaterialPayload,
  InsertReadingQuestionPayload,
  ListReadingMaterialsQuery,
  ReadingExpectedAnswerRow,
  ReadingMaterialListRow,
  ReadingMaterialRow,
  ReadingQuestionWithAnswerRow,
  ReadingStatus,
  SaveReadingAnswersPayload,
  SequenceRow,
} from './reading.types';

const readingCodeLockNamespace = 141_421_356;

export const getLastSequenceByDateForUpdate = async (
  dateKey: number,
  dateSegment: string,
  trx: DatabaseReservedConnection,
): Promise<SequenceRow> => {
  await trx`
    SELECT
      pg_advisory_xact_lock(${readingCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<SequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM reading_materials
    WHERE code LIKE ${`RD-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Reading sequence query did not return a row.');
  }

  return row;
};

export const insert = async (
  payload: InsertReadingMaterialPayload,
  trx: DatabaseReservedConnection,
): Promise<IdRow> => {
  const allowedColumns = [
    'code',
    'title',
    'level',
    'genre',
    'tags',
    'target_word_count',
    'target_question_count',
    'word_count',
    'content_text',
    'is_override',
    'source',
  ] as const;

  const insertInput = { ...payload, tags: trx.array(payload.tags, 'TEXT') };

  const [material] = await trx<IdRow[]>`
    INSERT INTO reading_materials ${trx(insertInput, ...allowedColumns)}
    RETURNING
      id
  `;

  if (material === undefined) {
    throw new Error('Reading material creation did not return a row.');
  }

  return material;
};

export const bulkInsertQuestions = async (
  materialId: number,
  questions: InsertReadingQuestionPayload[],
  trx: DatabaseReservedConnection,
): Promise<void> => {
  await trx`
    INSERT INTO reading_questions (
      material_id,
      question_number,
      question_text,
      expected_answer
    )
    SELECT
      ${materialId},
      payload.question_number,
      payload.question_text,
      payload.expected_answer
    FROM jsonb_to_recordset(${questions}) AS payload(
      question_number INTEGER,
      question_text TEXT,
      expected_answer TEXT
    )
  `;
};

export const getAllQuestionsByMaterialId = async (
  materialId: number,
  trx?: DatabaseReservedConnection,
): Promise<ReadingQuestionWithAnswerRow[]> => {
  const database = trx ?? getDatabaseClient();

  return database<ReadingQuestionWithAnswerRow[]>`
    SELECT
      q.question_number,
      q.question_text,
      a.user_answer
    FROM reading_questions q
    LEFT JOIN reading_submissions s ON s.material_id = q.material_id AND s.deleted_at IS NULL
    LEFT JOIN reading_answers a ON a.submission_id = s.id AND a.question_id = q.id AND a.deleted_at IS NULL
    WHERE q.material_id = ${materialId} AND q.deleted_at IS NULL
    ORDER BY
      q.question_number ASC
  `;
};

export const getOneByCode = async (
  code: string,
  trx?: DatabaseReservedConnection,
): Promise<ReadingMaterialRow | null> => {
  const database = trx ?? getDatabaseClient();

  const [material] = await database<ReadingMaterialRow[]>`
    SELECT
      id,
      code,
      title,
      level,
      genre,
      tags,
      word_count,
      content_text,
      reading_status,
      created_at,
      updated_at,
      is_override,
      source
    FROM reading_materials
    WHERE code = ${code} AND deleted_at IS NULL
  `;

  return material ?? null;
};

export const getAll = async (input: ListReadingMaterialsQuery): Promise<ReadingMaterialListRow[]> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const levels = input.levels ?? null;

  return database<ReadingMaterialListRow[]>`
    SELECT
      code,
      title,
      LEFT(REGEXP_REPLACE(content_text, $$\\s+$$, ' ', 'g'), 200) AS content_excerpt,
      genre,
      level,
      tags,
      reading_status,
      created_at
    FROM reading_materials
    WHERE deleted_at IS NULL
      AND (${searchPattern}::TEXT IS NULL OR title ILIKE ${searchPattern} OR genre ILIKE ${searchPattern}
        OR code ILIKE ${searchPattern} OR ARRAY_TO_STRING(tags, ' ') ILIKE ${searchPattern})
      AND (${levels === null} OR level = ANY(${database.array(levels ?? [], 'TEXT')}))
      AND (${input.genre ?? null}::TEXT IS NULL OR genre = ${input.genre ?? null})
      AND (${input.reading_status ?? null}::TEXT IS NULL OR reading_status = ${input.reading_status ?? null})
    ORDER BY
      CASE WHEN ${input.sort} = 'oldest' THEN created_at END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN created_at END DESC,
      CASE WHEN ${input.sort} = 'oldest' THEN id END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN id END DESC
    LIMIT ${input.limit}
  `;
};

export const updateOneStatusByCode = async (
  code: string,
  status: ReadingStatus,
  trx?: DatabaseReservedConnection,
): Promise<IdRow | null> => {
  const database = trx ?? getDatabaseClient();

  const [row] = await database<IdRow[]>`
    UPDATE reading_materials
    SET
      reading_status = ${status},
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      id
  `;

  return row ?? null;
};

export const getOneIdByCodeForUpdate = async (code: string, trx: DatabaseReservedConnection): Promise<IdRow | null> => {
  // Serialize edits to the same answer group and keep ownership validation inside the transaction.
  const [row] = await trx<IdRow[]>`
    SELECT
      id
    FROM reading_materials
    WHERE code = ${code}
      AND deleted_at IS NULL
    FOR UPDATE
  `;

  return row ?? null;
};

export const upsertOneSubmissionByMaterialId = async (
  materialId: number,
  trx: DatabaseReservedConnection,
): Promise<IdRow> => {
  const [row] = await trx<IdRow[]>`
    INSERT INTO reading_submissions (
      material_id
    )
    VALUES (
      ${materialId}
    )
    ON CONFLICT (material_id) WHERE deleted_at IS NULL DO UPDATE
    SET
      updated_at = NOW()
    RETURNING
      id
  `;

  if (row === undefined) {
    throw new Error('Reading answer group was not returned.');
  }

  return row;
};

export const softDeleteAllAnswersByMaterialIdAndQuestionNumbers = async (
  materialId: number,
  questionNumbers: number[],
  trx: DatabaseReservedConnection,
): Promise<void> => {
  await trx`
    UPDATE reading_answers a
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    FROM reading_questions q,
      reading_submissions s
    WHERE a.question_id = q.id AND a.submission_id = s.id
      AND q.material_id = ${materialId} AND s.material_id = ${materialId}
      AND q.question_number = ANY(${trx.array(questionNumbers, 'INTEGER')})
      AND q.deleted_at IS NULL AND s.deleted_at IS NULL AND a.deleted_at IS NULL
  `;
};

export const upsertAllAnswersByMaterialId = async (
  materialId: number,
  submissionId: number,
  input: SaveReadingAnswersPayload,
  trx: DatabaseReservedConnection,
): Promise<void> => {
  await trx`
    INSERT INTO reading_answers (
      submission_id,
      question_id,
      user_answer
    )
    SELECT
      ${submissionId},
      q.id,
      payload.user_answer
    FROM reading_questions q
    JOIN jsonb_to_recordset(${input.answers}) AS payload(
      question_number INTEGER,
      user_answer TEXT
    ) ON payload.question_number = q.question_number
    WHERE q.material_id = ${materialId} AND q.deleted_at IS NULL
    ON CONFLICT (submission_id, question_id) DO UPDATE
    SET
      user_answer = EXCLUDED.user_answer,
      deleted_at = NULL,
      updated_at = NOW()
  `;
};

export const getAllExpectedAnswersByCode = async (code: string): Promise<ReadingExpectedAnswerRow[]> => {
  const database = getDatabaseClient();

  return database<ReadingExpectedAnswerRow[]>`
    SELECT
      q.question_number,
      q.question_text,
      q.expected_answer
    FROM reading_questions q
    JOIN reading_materials m ON m.id = q.material_id
    WHERE m.code = ${code} AND m.deleted_at IS NULL AND q.deleted_at IS NULL
    ORDER BY
      q.question_number ASC
  `;
};
