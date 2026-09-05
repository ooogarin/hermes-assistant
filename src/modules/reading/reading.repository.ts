import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateReadingMaterialRequest,
  IdRow,
  InsertReadingSubmissionResult,
  ReadingExpectedAnswer,
  ReadingExpectedAnswerRow,
  ReadingMaterial,
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
  defaultLevel: row.default_level,
  defaultWordCount: row.default_word_count,
  minWordCount: row.min_word_count,
  maxWordCount: row.max_word_count,
  updatedAt: toIsoTimestamp(row.updated_at),
});

const toReadingMaterial = (row: ReadingMaterialRow, questions: ReadingQuestion[]): ReadingMaterial => ({
  code: row.code,
  topic: row.topic,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  targetWordCount: row.target_word_count,
  wordCount: row.word_count,
  passageText: row.passage_text,
  isOverride: row.is_override,
  source: row.source,
  questions,
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
      default_level = CASE WHEN ${input.defaultLevel !== undefined} THEN ${input.defaultLevel ?? ''} ELSE default_level END,
      default_word_count = CASE
        WHEN ${input.defaultWordCount !== undefined} THEN ${input.defaultWordCount ?? 0}
        ELSE default_word_count
      END,
      min_word_count = CASE WHEN ${input.minWordCount !== undefined} THEN ${input.minWordCount ?? 0} ELSE min_word_count END,
      max_word_count = CASE WHEN ${input.maxWordCount !== undefined} THEN ${input.maxWordCount ?? 0} ELSE max_word_count END,
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
  wordCount: number,
  isOverride: boolean,
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
      ${input.targetWordCount},
      ${wordCount},
      ${input.passageText},
      ${isOverride},
      ${input.source}::reading_source
    )
    RETURNING
      id
  `;

  if (material === undefined) {
    throw new Error('Reading material creation did not return a row.');
  }

  const questionNumbers = input.questions.map((_, index) => index + 1);
  const questionTexts = input.questions.map((question) => question.questionText);
  const expectedAnswers = input.questions.map((question) => question.expectedAnswer);

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
    questionNumber: row.question_number,
    questionText: row.question_text,
    userAnswer: row.user_answer,
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

  const questionNumbers = input.answers.map((answer) => answer.questionNumber);
  const userAnswers = input.answers.map((answer) => answer.userAnswer);
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
    questionNumber: row.question_number,
    questionText: row.question_text,
    expectedAnswer: row.expected_answer,
  }));
};
