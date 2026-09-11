import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseExecutor, DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateGrammarSessionPayload,
  EvaluateGrammarSessionPayload,
  GrammarCountRow,
  GrammarExplanationRow,
  GrammarQuestionRow,
  GrammarReportRow,
  GrammarSessionListRow,
  GrammarSessionRow,
  GrammarSettingsRow,
  IdRow,
  ListGrammarSessionsQuery,
  SaveGrammarAnswerPayload,
  SequenceRow,
  UpdateGrammarSettingsPayload,
} from './grammar.types';

const grammarCodeLockNamespace = 161_803_398;

export const getSettings = async (): Promise<GrammarSettingsRow> => {
  const [row] = await getDatabaseClient()<GrammarSettingsRow[]>`
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

  return row;
};

export const updateSettings = async (input: UpdateGrammarSettingsPayload): Promise<GrammarSettingsRow> => {
  const [row] = await getDatabaseClient()<GrammarSettingsRow[]>`
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

  return row;
};

export const getNextSequence = async (
  trx: DatabaseReservedConnection,
  dateKey: number,
  dateSegment: string,
): Promise<SequenceRow> => {
  await trx`
    SELECT pg_advisory_xact_lock(${grammarCodeLockNamespace}::INTEGER, ${dateKey}::INTEGER)
  `;

  const [row] = await trx<SequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM grammar_sessions
    WHERE code LIKE ${`GR-${dateSegment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Grammar sequence query did not return a row.');
  }

  return row;
};

export const insertSession = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: CreateGrammarSessionPayload,
): Promise<IdRow> => {
  const [session] = await trx<IdRow[]>`
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

  return session;
};

export const insertQuestions = async (
  trx: DatabaseReservedConnection,
  sessionId: number,
  questions: CreateGrammarSessionPayload['questions'],
): Promise<void> => {
  const questionNumbers = questions.map((question) => question.question_number);
  const questionTypes = questions.map((question) => question.question_type);
  const grammarAreas = questions.map((question) => question.grammar_area);
  const grammarPoints = questions.map((question) => question.grammar_point);
  const levels = questions.map((question) => question.level);
  const questionTexts = questions.map((question) => question.question_text);
  const correctAnswers = questions.map((question) => question.correct_answer);
  const explanations = questions.map((question) => question.explanation);

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
      ${sessionId},
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

export const listSessions = async (input: ListGrammarSessionsQuery): Promise<GrammarSessionListRow[]> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const offset = (input.page - 1) * input.limit;

  return database<GrammarSessionListRow[]>`
    WITH session_summary AS (
      SELECT
        grammar_sessions.id,
        grammar_sessions.code,
        grammar_sessions.mode,
        grammar_sessions.source,
        grammar_sessions.status,
        grammar_sessions.level,
        grammar_sessions.question_count,
        grammar_sessions.score,
        grammar_sessions.max_score,
        grammar_sessions.started_at,
        grammar_sessions.completed_at,
        focus.grammar_area,
        focus.grammar_point,
        (
          SELECT COUNT(*)::INTEGER
          FROM grammar_answers
          JOIN grammar_questions ON grammar_questions.id = grammar_answers.question_id
          WHERE grammar_questions.session_id = grammar_sessions.id
            AND grammar_questions.deleted_at IS NULL
            AND grammar_answers.deleted_at IS NULL
        ) AS answered_question_count
      FROM grammar_sessions
      LEFT JOIN LATERAL (
        SELECT
          grammar_questions.grammar_area,
          grammar_questions.grammar_point
        FROM grammar_questions
        WHERE grammar_questions.session_id = grammar_sessions.id
          AND grammar_questions.deleted_at IS NULL
        ORDER BY grammar_questions.question_number ASC
        LIMIT 1
      ) AS focus ON TRUE
      WHERE grammar_sessions.deleted_at IS NULL
    )
    SELECT
      code,
      mode,
      source,
      status,
      level,
      grammar_area,
      grammar_point,
      question_count,
      answered_question_count,
      score,
      max_score,
      started_at,
      completed_at
    FROM session_summary
    WHERE (${searchPattern}::TEXT IS NULL
      OR code ILIKE ${searchPattern}
      OR EXISTS (
        SELECT 1
        FROM grammar_questions
        WHERE grammar_questions.session_id = session_summary.id
          AND grammar_questions.deleted_at IS NULL
          AND (
            grammar_questions.grammar_area ILIKE ${searchPattern}
            OR grammar_questions.grammar_point ILIKE ${searchPattern}
          )
      )
    )
      AND (${input.status}::TEXT IS NULL OR status::TEXT = ${input.status})
      AND (${input.mode}::TEXT IS NULL OR mode::TEXT = ${input.mode})
      AND (${input.level}::TEXT IS NULL OR level = ${input.level})
    ORDER BY
      CASE WHEN ${input.sort} = 'oldest' THEN started_at END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN started_at END DESC,
      CASE WHEN ${input.sort} = 'oldest' THEN id END ASC,
      CASE WHEN ${input.sort} = 'newest' THEN id END DESC
    LIMIT ${input.limit}
    OFFSET ${offset}
  `;
};

export const countSessions = async (input: ListGrammarSessionsQuery): Promise<GrammarCountRow> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;
  const [row] = await database<GrammarCountRow[]>`
    SELECT COUNT(*)::INTEGER AS total
    FROM grammar_sessions
    WHERE grammar_sessions.deleted_at IS NULL
      AND (${searchPattern}::TEXT IS NULL
        OR grammar_sessions.code ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1
          FROM grammar_questions
          WHERE grammar_questions.session_id = grammar_sessions.id
            AND grammar_questions.deleted_at IS NULL
            AND (
              grammar_questions.grammar_area ILIKE ${searchPattern}
              OR grammar_questions.grammar_point ILIKE ${searchPattern}
            )
        )
      )
      AND (${input.status}::TEXT IS NULL OR grammar_sessions.status::TEXT = ${input.status})
      AND (${input.mode}::TEXT IS NULL OR grammar_sessions.mode::TEXT = ${input.mode})
      AND (${input.level}::TEXT IS NULL OR grammar_sessions.level = ${input.level})
  `;

  if (row === undefined) {
    throw new Error('Grammar session count query did not return a row.');
  }

  return row;
};

const getQuestionsWithExecutor = async (
  database: DatabaseExecutor,
  sessionId: number,
): Promise<GrammarQuestionRow[]> => {
  return database<GrammarQuestionRow[]>`
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
};

export const getQuestions = async (sessionId: number): Promise<GrammarQuestionRow[]> => {
  return getQuestionsWithExecutor(getDatabaseClient(), sessionId);
};

export const getQuestionsInTransaction = async (
  trx: DatabaseReservedConnection,
  sessionId: number,
): Promise<GrammarQuestionRow[]> => {
  return getQuestionsWithExecutor(trx, sessionId);
};

export const getSessionForUpdate = async (
  trx: DatabaseReservedConnection,
  code: string,
): Promise<GrammarSessionRow | null> => {
  // Serialize status checks with answer/evaluation writes so a completed session cannot be mutated afterward.
  const [row] = await trx<GrammarSessionRow[]>`
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
    FOR UPDATE
  `;

  if (row === undefined) {
    return null;
  }

  return row;
};

export const upsertAnswer = async (
  trx: DatabaseReservedConnection,
  code: string,
  question_number: number,
  input: SaveGrammarAnswerPayload,
): Promise<IdRow | null> => {
  const [row] = await trx<IdRow[]>`
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
      AND grammar_sessions.status = 'active'
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

  return row ?? null;
};

export const getExplanation = async (code: string, question_number: number): Promise<GrammarExplanationRow | null> => {
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

  return row ?? null;
};

export const saveEvaluation = async (
  trx: DatabaseReservedConnection,
  code: string,
  input: EvaluateGrammarSessionPayload,
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
      AND grammar_sessions.status = 'active'
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
      AND status = 'active'
  `;
};

const getReportWithExecutor = async (database: DatabaseExecutor, code: string): Promise<GrammarReportRow[]> => {
  return database<GrammarReportRow[]>`
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
};

export const getReport = async (code: string): Promise<GrammarReportRow[]> => {
  return getReportWithExecutor(getDatabaseClient(), code);
};

export const getReportInTransaction = async (
  trx: DatabaseReservedConnection,
  code: string,
): Promise<GrammarReportRow[]> => {
  return getReportWithExecutor(trx, code);
};

export const softDeleteSession = async (trx: DatabaseReservedConnection, code: string): Promise<IdRow | null> => {
  const [session] = await trx<IdRow[]>`
    UPDATE grammar_sessions
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING id
  `;

  if (session === undefined) {
    return null;
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

  return session;
};
