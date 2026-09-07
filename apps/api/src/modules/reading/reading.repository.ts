import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CountRow,
  CreateReadingMaterialRequest,
  IdRow,
  InsertReadingSubmissionResult,
  ListReadingMaterialsRequest,
  ReadingExpectedAnswer,
  ReadingExpectedAnswerRow,
  ReadingMaterial,
  ReadingMaterialList,
  ReadingMaterialListItem,
  ReadingMaterialListRow,
  ReadingMaterialRow,
  ReadingQuestion,
  ReadingQuestionWithAnswerRow,
  ReadingSettings,
  ReadingSettingsRow,
  SaveReadingSubmissionRequest,
  SequenceRow,
  UpdateReadingSettingsRequest,
} from './reading.types';

const readingCodeLockNamespace = 141_421_356;
const readingSubmissionLockNamespace = 244_948_974;

const toReadingSettings = (row: ReadingSettingsRow): ReadingSettings => ({
  default_level: row.default_level,
  default_word_count: row.default_word_count,
  min_word_count: row.min_word_count,
  max_word_count: row.max_word_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const toReadingMaterial = (row: ReadingMaterialRow, questions: ReadingQuestion[]): ReadingMaterial => ({
  code: row.code,
  topic: row.topic,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  target_word_count: row.target_word_count,
  word_count: row.word_count,
  passage_text: row.passage_text,
  is_override: row.is_override,
  source: row.source,
  questions,
});

const toReadingMaterialListItem = (row: ReadingMaterialListRow): ReadingMaterialListItem => ({
  code: row.code,
  topic: row.topic,
  genre: row.genre,
  level: row.level,
  target_word_count: row.target_word_count,
  word_count: row.word_count,
  tags: row.tags,
  source: row.source,
  status: row.status,
  question_count: Number(row.question_count),
  answered_question_count: Number(row.answered_question_count),
  created_at: toIsoTimestamp(row.created_at),
});

export const getSettings = async (): Promise<ReadingSettings> => {
  const [row] = await getDatabaseClient()<ReadingSettingsRow[]>`
    SELECT
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
    FROM reading_settings
    ORDER BY id ASC
    LIMIT 1
  `;

  if (row === undefined) {
    throw new Error('Reading settings are missing.');
  }

  return toReadingSettings(row);
};

export const updateSettings = async (input: UpdateReadingSettingsRequest): Promise<ReadingSettings> => {
  const [row] = await getDatabaseClient()<ReadingSettingsRow[]>`
    UPDATE reading_settings
    SET
      default_level = CASE WHEN ${input.default_level !== undefined} THEN ${input.default_level ?? ''} ELSE default_level END,
      default_word_count = CASE
        WHEN ${input.default_word_count !== undefined} THEN ${input.default_word_count ?? 0}
        ELSE default_word_count
      END,
      min_word_count = CASE WHEN ${input.min_word_count !== undefined} THEN ${input.min_word_count ?? 0} ELSE min_word_count END,
      max_word_count = CASE WHEN ${input.max_word_count !== undefined} THEN ${input.max_word_count ?? 0} ELSE max_word_count END,
      updated_at = NOW()
    WHERE id = (SELECT id FROM reading_settings ORDER BY id ASC LIMIT 1)
    RETURNING
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Reading settings are missing.');
  }

  return toReadingSettings(row);
};

export const generateCode = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<string> => {
  await trx`
    SELECT pg_advisory_xact_lock(${readingCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<SequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM reading_materials
    WHERE code LIKE ${`RD-${dateSegment}-%`}
  `;

  return `RD-${dateSegment}-${String((row?.sequence ?? 0) + 1).padStart(3, '0')}`;
};

export const insertMaterial = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateReadingMaterialRequest,
  word_count: number,
  is_override: boolean,
): Promise<void> => {
  const [material] = await trx<IdRow[]>`
    INSERT INTO reading_materials (
      code,
      topic,
      level,
      genre,
      tags,
      target_word_count,
      word_count,
      passage_text,
      is_override,
      source
    )
    VALUES (
      ${code},
      ${input.topic},
      ${input.level},
      ${input.genre},
      ${trx.array(input.tags, 'TEXT')},
      ${input.target_word_count},
      ${word_count},
      ${input.passage_text},
      ${is_override},
      ${input.source}::reading_source
    )
    RETURNING
      id
  `;

  if (material === undefined) {
    throw new Error('Reading material creation did not return a row.');
  }

  const questionNumbers = input.questions.map((_, index) => index + 1);
  const questionTexts = input.questions.map((question) => question.question_text);
  const expectedAnswers = input.questions.map((question) => question.expected_answer);

  await trx`
    INSERT INTO reading_questions (
      material_id,
      question_number,
      question_text,
      expected_answer
    )
    SELECT
      ${material.id},
      payload.question_number,
      payload.question_text,
      payload.expected_answer
    FROM UNNEST(
      ${trx.array(questionNumbers, 'INTEGER')},
      ${trx.array(questionTexts, 'TEXT')},
      ${trx.array(expectedAnswers, 'TEXT')}
    ) AS payload(question_number, question_text, expected_answer)
  `;
};

export const findByCode = async (code: string): Promise<ReadingMaterial | null> => {
  const [material] = await getDatabaseClient()<ReadingMaterialRow[]>`
    SELECT
      id,
      code,
      topic,
      level,
      genre,
      tags,
      target_word_count,
      word_count,
      passage_text,
      is_override,
      source
    FROM reading_materials
    WHERE code = ${code} AND deleted_at IS NULL
  `;
  if (material === undefined) {
    return null;
  }

  const questions = await getQuestions(material.id);
  return toReadingMaterial(material, questions);
};

export const listMaterials = async (input: ListReadingMaterialsRequest): Promise<ReadingMaterialList> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const offset = (input.page - 1) * input.limit;
  const [rows, [count]] = await Promise.all([
    database<ReadingMaterialListRow[]>`
      WITH material_summary AS (
        SELECT
          m.id,
          m.code,
          m.topic,
          m.genre,
          m.level,
          m.target_word_count,
          m.word_count,
          m.tags,
          m.source,
          m.created_at,
          EXISTS (
            SELECT 1
            FROM reading_submissions s
            WHERE s.material_id = m.id AND s.deleted_at IS NULL
          ) AS is_completed,
          (
            SELECT COUNT(*)::INTEGER
            FROM reading_questions q
            WHERE q.material_id = m.id AND q.deleted_at IS NULL
          ) AS question_count,
          (
            SELECT COUNT(*)::INTEGER
            FROM reading_answers a
            JOIN reading_submissions s ON s.id = a.submission_id
            WHERE s.material_id = m.id AND s.deleted_at IS NULL AND a.deleted_at IS NULL
          ) AS answered_question_count
        FROM reading_materials m
        WHERE m.deleted_at IS NULL
      )
      SELECT
        code,
        topic,
        genre,
        level,
        target_word_count,
        word_count,
        tags,
        source,
        CASE WHEN is_completed THEN 'completed' ELSE 'unanswered' END AS status,
        question_count,
        answered_question_count,
        created_at
      FROM material_summary
      WHERE (${searchPattern}::TEXT IS NULL OR (
        topic ILIKE ${searchPattern}
        OR genre ILIKE ${searchPattern}
        OR code ILIKE ${searchPattern}
        OR ARRAY_TO_STRING(tags, ' ') ILIKE ${searchPattern}
      ))
        AND (${input.level}::TEXT IS NULL OR level = ${input.level})
        AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
        AND (${input.status}::TEXT IS NULL OR CASE WHEN is_completed THEN 'completed' ELSE 'unanswered' END = ${input.status})
      ORDER BY
        CASE WHEN ${input.sort} = 'oldest' THEN created_at END ASC,
        CASE WHEN ${input.sort} = 'newest' THEN created_at END DESC,
        CASE WHEN ${input.sort} = 'oldest' THEN id END ASC,
        CASE WHEN ${input.sort} = 'newest' THEN id END DESC
      LIMIT ${input.limit}
      OFFSET ${offset}
    `,
    database<CountRow[]>`
      WITH material_summary AS (
        SELECT
          m.id,
          m.code,
          m.topic,
          m.genre,
          m.level,
          m.tags,
          EXISTS (
            SELECT 1
            FROM reading_submissions s
            WHERE s.material_id = m.id AND s.deleted_at IS NULL
          ) AS is_completed
        FROM reading_materials m
        WHERE m.deleted_at IS NULL
      )
      SELECT COUNT(*)::INTEGER AS total
      FROM material_summary
      WHERE (${searchPattern}::TEXT IS NULL OR (
        topic ILIKE ${searchPattern}
        OR genre ILIKE ${searchPattern}
        OR code ILIKE ${searchPattern}
        OR ARRAY_TO_STRING(tags, ' ') ILIKE ${searchPattern}
      ))
        AND (${input.level}::TEXT IS NULL OR level = ${input.level})
        AND (${input.genre}::TEXT IS NULL OR genre = ${input.genre})
        AND (${input.status}::TEXT IS NULL OR CASE WHEN is_completed THEN 'completed' ELSE 'unanswered' END = ${input.status})
    `,
  ]);
  const total = Number(count?.total ?? 0);

  return {
    items: rows.map(toReadingMaterialListItem),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      total_pages: Math.ceil(total / input.limit),
    },
  };
};

export const getQuestions = async (materialId: number): Promise<ReadingQuestion[]> => {
  const rows = await getDatabaseClient()<ReadingQuestionWithAnswerRow[]>`
    SELECT
      q.question_number,
      q.question_text,
      a.user_answer
    FROM reading_questions q
    LEFT JOIN reading_submissions s ON s.material_id = q.material_id AND s.deleted_at IS NULL
    LEFT JOIN reading_answers a ON a.submission_id = s.id AND a.question_id = q.id AND a.deleted_at IS NULL
    WHERE q.material_id = ${materialId} AND q.deleted_at IS NULL
    ORDER BY q.question_number ASC
  `;
  return rows.map((row) => ({
    question_number: row.question_number,
    question_text: row.question_text,
    user_answer: row.user_answer,
  }));
};

export const insertSubmission = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: SaveReadingSubmissionRequest,
): Promise<InsertReadingSubmissionResult> => {
  // Keep the existence check and single-submission insert deterministic for concurrent requests.
  await trx`
    SELECT pg_advisory_xact_lock(${readingSubmissionLockNamespace}::INTEGER, hashtext(${code}))
  `;

  const [submission] = await trx<IdRow[]>`
    INSERT INTO reading_submissions (material_id)
    SELECT id FROM reading_materials WHERE code = ${code} AND deleted_at IS NULL
    ON CONFLICT (material_id) DO NOTHING
    RETURNING id
  `;

  if (submission === undefined) {
    const [status] = await trx<{ material_exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM reading_materials
        WHERE code = ${code} AND deleted_at IS NULL
      ) AS material_exists
    `;

    return status?.material_exists ? 'already_submitted' : 'material_not_found';
  }

  const questionNumbers = input.answers.map((answer) => answer.question_number);
  const userAnswers = input.answers.map((answer) => answer.user_answer);
  await trx`
    INSERT INTO reading_answers (
      submission_id,
      question_id,
      user_answer
    )
    SELECT
      ${submission.id},
      q.id,
      payload.user_answer
    FROM reading_questions q
    JOIN reading_materials m ON m.id = q.material_id
    JOIN UNNEST(${trx.array(questionNumbers, 'INTEGER')}, ${trx.array(userAnswers, 'TEXT')}) AS payload(question_number, user_answer)
      ON payload.question_number = q.question_number
    WHERE m.code = ${code} AND q.deleted_at IS NULL
  `;
  return 'created';
};

export const getExpectedAnswers = async (code: string): Promise<ReadingExpectedAnswer[]> => {
  const rows = await getDatabaseClient()<ReadingExpectedAnswerRow[]>`
    SELECT
      q.question_number,
      q.question_text,
      q.expected_answer
    FROM reading_questions q
    JOIN reading_materials m ON m.id = q.material_id
    WHERE m.code = ${code} AND m.deleted_at IS NULL AND q.deleted_at IS NULL
    ORDER BY q.question_number ASC
  `;
  return rows.map((row) => ({
    question_number: row.question_number,
    question_text: row.question_text,
    expected_answer: row.expected_answer,
  }));
};
