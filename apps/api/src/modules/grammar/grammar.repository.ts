import { getDatabaseClient } from '../../core/database/client';
import { toIsoTimestamp } from '../../shared/date/date';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarExplanationRow,
  GrammarQuestion,
  GrammarQuestionRow,
  GrammarReport,
  GrammarReportRow,
  GrammarSession,
  GrammarSessionRow,
  GrammarSettings,
  SaveGrammarAnswerRequest,
  UpdateGrammarSettingsRequest,
} from './grammar.types';

const grammarCodeLockNamespace = 161_803_398;

const toSettings = (row: {
  default_level: string;
  daily_question_count: number;
  updated_at: Date | string;
}): GrammarSettings => ({
  default_level: row.default_level,
  daily_question_count: row.daily_question_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const toQuestion = (row: GrammarQuestionRow): GrammarQuestion => ({
  question_number: row.question_number,
  question_type: row.question_type,
  grammar_area: row.grammar_area,
  grammar_point: row.grammar_point,
  level: row.level,
  question_text: row.question_text,
  answer:
    row.user_answer === null
      ? null
      : {
          user_answer: row.user_answer,
          result: row.answer_result,
          feedback: row.feedback,
          answered_at: row.answered_at === null ? null : toIsoTimestamp(row.answered_at),
          evaluated_at: row.evaluated_at === null ? null : toIsoTimestamp(row.evaluated_at),
        },
});

const toSession = (row: GrammarSessionRow, questions: GrammarQuestion[]): GrammarSession => ({
  code: row.code,
  mode: row.mode,
  source: row.source,
  status: row.status,
  level: row.level,
  question_count: row.question_count,
  score: row.score,
  max_score: row.max_score,
  started_at: toIsoTimestamp(row.started_at),
  completed_at: row.completed_at === null ? null : toIsoTimestamp(row.completed_at),
  questions,
});

export const getSettings = async (): Promise<GrammarSettings> => {
  const [row] = await getDatabaseClient()<
    { default_level: string; daily_question_count: number; updated_at: Date | string }[]
  >`
    SELECT
      default_level,
      daily_question_count,
      updated_at
    FROM grammar_settings
    ORDER BY id ASC
    LIMIT 1
  `;

  if (row === undefined) {
    throw new Error('Grammar settings are missing.');
  }

  return toSettings(row);
};

export const updateSettings = async (input: UpdateGrammarSettingsRequest): Promise<GrammarSettings> => {
  const [row] = await getDatabaseClient()<
    { default_level: string; daily_question_count: number; updated_at: Date | string }[]
  >`
    UPDATE grammar_settings
    SET
      default_level = CASE WHEN ${input.default_level !== undefined} THEN ${input.default_level ?? ''} ELSE default_level END,
      daily_question_count = CASE
        WHEN ${input.daily_question_count !== undefined} THEN ${input.daily_question_count ?? 0}
        ELSE daily_question_count
      END,
      updated_at = NOW()
    WHERE id = (SELECT id FROM grammar_settings ORDER BY id ASC LIMIT 1)
    RETURNING
      default_level,
      daily_question_count,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Grammar settings are missing.');
  }

  return toSettings(row);
};

export const generateCode = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<string> => {
  await trx`
    SELECT pg_advisory_xact_lock(${grammarCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<{ sequence: number }[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM grammar_sessions
    WHERE code LIKE ${`GR-${dateSegment}-%`}
  `;

  return `GR-${dateSegment}-${String((row?.sequence ?? 0) + 1).padStart(3, '0')}`;
};

export const insertSession = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateGrammarSessionRequest,
): Promise<void> => {
  const [session] = await trx<{ id: number }[]>`
    INSERT INTO grammar_sessions (code, mode, source, level, question_count)
    VALUES (
      ${code},
      ${input.mode}::grammar_mode,
      ${input.source}::grammar_source,
      ${input.level},
      ${input.questions.length}
    )
    RETURNING id
  `;

  if (session === undefined) {
    throw new Error('Grammar session creation did not return a row.');
  }

  const questionNumbers = input.questions.map((_, index) => index + 1);
  const questionTypes = input.questions.map((question) => question.question_type);
  const grammarAreas = input.questions.map((question) => question.grammar_area);
  const grammarPoints = input.questions.map((question) => question.grammar_point);
  const levels = input.questions.map((question) => question.level);
  const questionTexts = input.questions.map((question) => question.question_text);
  const correctAnswers = input.questions.map((question) => question.correct_answer);
  const explanations = input.questions.map((question) => question.explanation);

  await trx`
    INSERT INTO grammar_questions (
      session_id,
      question_number,
      question_type,
      grammar_area,
      grammar_point,
      level,
      question_text,
      correct_answer,
      explanation
    )
    SELECT
      ${session.id},
      payload.question_number,
      payload.question_type,
      payload.grammar_area,
      payload.grammar_point,
      payload.level,
      payload.question_text,
      payload.correct_answer,
      payload.explanation
    FROM UNNEST(
      ${trx.array(questionNumbers, 'INTEGER')},
      ${trx.array(questionTypes, 'TEXT')},
      ${trx.array(grammarAreas, 'TEXT')},
      ${trx.array(grammarPoints, 'TEXT')},
      ${trx.array(levels, 'TEXT')},
      ${trx.array(questionTexts, 'TEXT')},
      ${trx.array(correctAnswers, 'TEXT')},
      ${trx.array(explanations, 'TEXT')}
    ) AS payload(
      question_number,
      question_type,
      grammar_area,
      grammar_point,
      level,
      question_text,
      correct_answer,
      explanation
    )
  `;
};

export const findSessionRow = async (code: string): Promise<GrammarSessionRow | null> => {
  const [row] = await getDatabaseClient()<GrammarSessionRow[]>`
    SELECT
      id,
      code,
      mode,
      source,
      status,
      level,
      question_count,
      score,
      max_score,
      started_at,
      completed_at
    FROM grammar_sessions
    WHERE code = ${code}
      AND deleted_at IS NULL
  `;

  return row ?? null;
};

export const getQuestions = async (sessionId: number): Promise<GrammarQuestion[]> => {
  const rows = await getDatabaseClient()<GrammarQuestionRow[]>`
    SELECT
      grammar_questions.id,
      grammar_questions.question_number,
      grammar_questions.question_type,
      grammar_questions.grammar_area,
      grammar_questions.grammar_point,
      grammar_questions.level,
      grammar_questions.question_text,
      grammar_answers.user_answer,
      grammar_answers.result AS answer_result,
      grammar_answers.feedback,
      grammar_answers.answered_at,
      grammar_answers.evaluated_at
    FROM grammar_questions
    LEFT JOIN grammar_answers ON grammar_answers.question_id = grammar_questions.id AND grammar_answers.deleted_at IS NULL
    WHERE grammar_questions.session_id = ${sessionId}
      AND grammar_questions.deleted_at IS NULL
    ORDER BY grammar_questions.question_number ASC
  `;

  return rows.map(toQuestion);
};

export const getSession = async (code: string): Promise<GrammarSession | null> => {
  const row = await findSessionRow(code);

  if (row === null) {
    return null;
  }

  return toSession(row, await getQuestions(row.id));
};

export const upsertAnswer = async (
  code: string,
  question_number: number,
  input: SaveGrammarAnswerRequest,
): Promise<boolean> => {
  const [row] = await getDatabaseClient()<{ id: number }[]>`
    INSERT INTO grammar_answers (
      question_id,
      user_answer,
      result,
      feedback,
      answered_at,
      evaluated_at
    )
    SELECT
      grammar_questions.id,
      ${input.user_answer},
      ${input.result ?? null}::grammar_answer_result,
      ${input.feedback ?? null},
      NOW(),
      CASE WHEN ${input.result !== undefined} THEN NOW() ELSE NULL END
    FROM grammar_questions
    JOIN grammar_sessions ON grammar_sessions.id = grammar_questions.session_id
    WHERE grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
      AND grammar_questions.question_number = ${question_number}
      AND grammar_questions.deleted_at IS NULL
    ON CONFLICT (question_id) DO UPDATE
    SET
      user_answer = EXCLUDED.user_answer,
      result = EXCLUDED.result,
      feedback = EXCLUDED.feedback,
      answered_at = EXCLUDED.answered_at,
      evaluated_at = EXCLUDED.evaluated_at,
      updated_at = NOW(),
      deleted_at = NULL
    RETURNING id
  `;

  return row !== undefined;
};

export const getExplanation = async (code: string, question_number: number): Promise<GrammarExplanation | null> => {
  const [row] = await getDatabaseClient()<GrammarExplanationRow[]>`
    SELECT
      grammar_questions.question_number,
      grammar_questions.question_text,
      grammar_questions.grammar_area,
      grammar_questions.grammar_point,
      grammar_questions.explanation
    FROM grammar_questions
    JOIN grammar_sessions ON grammar_sessions.id = grammar_questions.session_id
    WHERE grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
      AND grammar_questions.question_number = ${question_number}
      AND grammar_questions.deleted_at IS NULL
  `;

  return row === undefined
    ? null
    : {
        question_number: row.question_number,
        question_text: row.question_text,
        grammar_area: row.grammar_area,
        grammar_point: row.grammar_point,
        explanation: row.explanation,
      };
};

export const saveEvaluation = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: EvaluateGrammarSessionRequest,
): Promise<void> => {
  const questionNumbers = input.answers.map((answer) => answer.question_number);
  const results = input.answers.map((answer) => answer.result);
  const feedback = input.answers.map((answer) => answer.feedback);
  await trx`
    UPDATE grammar_answers
    SET
      result = payload.result::grammar_answer_result,
      feedback = payload.feedback,
      evaluated_at = NOW(),
      updated_at = NOW()
    FROM grammar_questions
    JOIN grammar_sessions ON grammar_sessions.id = grammar_questions.session_id
    JOIN UNNEST(
      ${trx.array(questionNumbers, 'INTEGER')},
      ${trx.array(results, 'TEXT')},
      ${trx.array(feedback, 'TEXT')}
    ) AS payload(question_number, result, feedback) ON payload.question_number = grammar_questions.question_number
    WHERE grammar_answers.question_id = grammar_questions.id
      AND grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
      AND grammar_questions.deleted_at IS NULL
      AND grammar_answers.deleted_at IS NULL
  `;
};

export const completeSession = async (
  trx: DatabaseReservedConnection,
  code: string,
  score: number,
  max_score: number,
): Promise<void> => {
  await trx`
    UPDATE grammar_sessions
    SET
      status = 'completed',
      score = ${score},
      max_score = ${max_score},
      completed_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
  `;
};

export const getReport = async (code: string): Promise<GrammarReport | null> => {
  const rows = await getDatabaseClient()<GrammarReportRow[]>`
    SELECT
      grammar_sessions.code,
      grammar_sessions.status,
      grammar_sessions.score,
      grammar_sessions.max_score,
      grammar_questions.grammar_area,
      COUNT(*) FILTER (WHERE grammar_answers.result = 'correct') AS correct,
      COUNT(*) FILTER (WHERE grammar_answers.result = 'partial') AS partial,
      COUNT(*) FILTER (WHERE grammar_answers.result = 'incorrect') AS incorrect
    FROM grammar_sessions
    JOIN grammar_questions ON grammar_questions.session_id = grammar_sessions.id AND grammar_questions.deleted_at IS NULL
    LEFT JOIN grammar_answers ON grammar_answers.question_id = grammar_questions.id AND grammar_answers.deleted_at IS NULL
    WHERE grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
    GROUP BY grammar_sessions.id, grammar_questions.grammar_area
    ORDER BY grammar_questions.grammar_area ASC
  `;

  const first = rows[0];

  if (first === undefined) {
    return null;
  }

  return {
    code: first.code,
    status: first.status,
    score: first.score,
    max_score: first.max_score,
    breakdown: rows.map((row) => ({
      grammar_area: row.grammar_area,
      correct: Number(row.correct),
      partial: Number(row.partial),
      incorrect: Number(row.incorrect),
    })),
  };
};

export const softDeleteSession = async (trx: DatabaseReservedConnection, code: string): Promise<boolean> => {
  const [session] = await trx<{ id: number }[]>`
    UPDATE grammar_sessions
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING id
  `;

  if (session === undefined) {
    return false;
  }

  await trx`
    UPDATE grammar_questions
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE session_id = ${session.id}
      AND deleted_at IS NULL
  `;
  await trx`
    UPDATE grammar_answers
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE question_id IN (SELECT id FROM grammar_questions WHERE session_id = ${session.id})
      AND deleted_at IS NULL
  `;

  return true;
};
