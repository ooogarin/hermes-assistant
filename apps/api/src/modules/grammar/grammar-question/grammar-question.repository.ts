import { getDatabaseClient } from '../../../core/database/client';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type { CreateGrammarQuestionPayload, GrammarQuestionRow } from './grammar-question.types';

export const bulkInsert = async (
  sessionId: number,
  questions: CreateGrammarQuestionPayload[],
  trx: DatabaseReservedConnection,
): Promise<void> => {
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
    FROM jsonb_to_recordset(${questions}) AS payload(
      question_number INTEGER,
      question_type TEXT,
      grammar_area TEXT,
      grammar_point TEXT,
      level TEXT,
      question_text TEXT,
      correct_answer TEXT,
      explanation TEXT
    )
  `;
};

export const getAllBySessionId = async (
  sessionId: number,
  trx?: DatabaseReservedConnection,
): Promise<GrammarQuestionRow[]> => {
  const database = trx ?? getDatabaseClient();

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
    ORDER BY
      grammar_questions.question_number ASC
  `;
};
