import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type { JakartaDateCodeParts } from '../../shared/date/date';
import type {
  CreateGrammarSessionPayload,
  EvaluateGrammarSessionPayload,
  GrammarCountRow,
  GrammarExplanationRow,
  GrammarReportRow,
  GrammarSessionListRow,
  GrammarSessionRow,
  IdRow,
  ListGrammarSessionsQuery,
  SaveAnswersPayload,
  SequenceRow,
} from './grammar.types';

const grammarCodeLockNamespace = 161_803_398;

export const getLastSequenceByDateForUpdate = async (
  codePrefix: string,
  date: JakartaDateCodeParts,
  trx: DatabaseReservedConnection,
): Promise<SequenceRow> => {
  await trx`
    SELECT
      pg_advisory_xact_lock(${grammarCodeLockNamespace}::INTEGER, ${date.key}::INTEGER)
  `;

  // Deliberately includes soft-deleted sessions: their codes stay reserved and must not be reused.
  const [row] = await trx<SequenceRow[]>`
    SELECT
      COALESCE(MAX(SPLIT_PART(code, '-', 3)::INTEGER), 0) AS sequence
    FROM grammar_sessions
    WHERE code LIKE ${`${codePrefix}-${date.segment}-%`}
  `;

  if (row === undefined) {
    throw new Error('Grammar sequence query did not return a row.');
  }

  return row;
};

export const insert = async (
  input: CreateGrammarSessionPayload,
  trx: DatabaseReservedConnection,
): Promise<GrammarSessionRow> => {
  const [session] = await trx<GrammarSessionRow[]>`
    INSERT INTO grammar_sessions (
      code,
      mode,
      source,
      level,
      question_count
    )
    VALUES (
      ${input.code},
      ${input.mode}::grammar_mode,
      ${input.source}::grammar_source,
      ${input.level},
      ${input.question_count}
    )
    RETURNING
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
  `;

  if (session === undefined) {
    throw new Error('Grammar session creation did not return a row.');
  }

  return session;
};

export const getOneByCode = async (
  code: string,
  trx?: DatabaseReservedConnection,
): Promise<GrammarSessionRow | null> => {
  const database = trx ?? getDatabaseClient();

  const [row] = await database<GrammarSessionRow[]>`
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

export const getAll = async (input: ListGrammarSessionsQuery): Promise<GrammarSessionListRow[]> => {
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
          SELECT
            COUNT(*)::INTEGER
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
        ORDER BY
          grammar_questions.question_number ASC
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
        SELECT
          1
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

export const countAll = async (input: ListGrammarSessionsQuery): Promise<GrammarCountRow> => {
  const database = getDatabaseClient();
  const searchPattern = input.q === undefined ? null : `%${input.q}%`;

  const [row] = await database<GrammarCountRow[]>`
    SELECT
      COUNT(*)::INTEGER AS total
    FROM grammar_sessions
    WHERE grammar_sessions.deleted_at IS NULL
      AND (${searchPattern}::TEXT IS NULL
        OR grammar_sessions.code ILIKE ${searchPattern}
        OR EXISTS (
          SELECT
            1
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

export const getOneByCodeForUpdate = async (
  code: string,
  trx: DatabaseReservedConnection,
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

export const upsertAllAnswersByCodeAndQuestionNumbers = async (
  code: string,
  input: SaveAnswersPayload,
  trx: DatabaseReservedConnection,
): Promise<void> => {
  await trx`
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
      payload.user_answer,
      payload.result::grammar_answer_result,
      payload.feedback,
      NOW(),
      CASE WHEN payload.result IS NOT NULL THEN NOW() ELSE NULL END
    FROM grammar_questions
    JOIN grammar_sessions ON grammar_sessions.id = grammar_questions.session_id
    JOIN jsonb_to_recordset(${input.answers}) AS payload(
      question_number INTEGER,
      user_answer TEXT,
      result TEXT,
      feedback TEXT
    ) ON payload.question_number = grammar_questions.question_number
    WHERE grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
      AND grammar_sessions.status = 'active'
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
  `;
};

export const getOneExplanationByCodeAndQuestionNumber = async (
  code: string,
  question_number: number,
): Promise<GrammarExplanationRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<GrammarExplanationRow[]>`
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

export const updateAllAnswerEvaluationsByCode = async (
  code: string,
  input: EvaluateGrammarSessionPayload,
  trx: DatabaseReservedConnection,
): Promise<void> => {
  await trx`
    UPDATE grammar_answers
    SET
      result = payload.result::grammar_answer_result,
      feedback = payload.feedback,
      evaluated_at = NOW(),
      updated_at = NOW()
    FROM grammar_questions
    JOIN grammar_sessions ON grammar_sessions.id = grammar_questions.session_id
    JOIN jsonb_to_recordset(${input.answers}) AS payload(
      question_number INTEGER,
      result TEXT,
      feedback TEXT
    ) ON payload.question_number = grammar_questions.question_number
    WHERE grammar_answers.question_id = grammar_questions.id
      AND grammar_sessions.code = ${code}
      AND grammar_sessions.deleted_at IS NULL
      AND grammar_sessions.status = 'active'
      AND grammar_questions.deleted_at IS NULL
      AND grammar_answers.deleted_at IS NULL
  `;
};

export const updateOneCompletionByCode = async (
  code: string,
  score: number,
  max_score: number,
  trx: DatabaseReservedConnection,
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

export const getAllReportRowsByCode = async (
  code: string,
  trx?: DatabaseReservedConnection,
): Promise<GrammarReportRow[]> => {
  const database = trx ?? getDatabaseClient();

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
    GROUP BY
      grammar_sessions.id,
      grammar_questions.grammar_area
    ORDER BY
      grammar_questions.grammar_area ASC
  `;
};

export const softDeleteOneByCode = async (code: string, trx: DatabaseReservedConnection): Promise<IdRow | null> => {
  const [session] = await trx<IdRow[]>`
    UPDATE grammar_sessions
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE code = ${code}
      AND deleted_at IS NULL
    RETURNING
      id
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
    WHERE question_id IN (
      SELECT
        id
      FROM grammar_questions
      WHERE session_id = ${session.id}
    )
      AND deleted_at IS NULL
  `;

  return session;
};
