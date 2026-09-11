import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import * as grammarRepository from './grammar.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateGrammarSessionPayload,
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionPayload,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarExplanationRow,
  GrammarQuestion,
  GrammarQuestionRow,
  GrammarReport,
  GrammarReportRow,
  GrammarSession,
  GrammarSessionList,
  GrammarSessionListItem,
  GrammarSessionListRow,
  GrammarSessionRow,
  GrammarSettings,
  ListGrammarSessionsQuery,
  ListGrammarSessionsRequest,
  SaveGrammarAnswerPayload,
  SaveGrammarAnswerRequest,
  UpdateGrammarSettingsPayload,
  UpdateGrammarSettingsRequest,
} from './grammar.types';

export const getSettings = async (): Promise<GrammarSettings> => {
  return toGrammarSettings(await grammarRepository.getSettings());
};

export const updateSettings = async (input: UpdateGrammarSettingsRequest): Promise<GrammarSettings> => {
  const payload: UpdateGrammarSettingsPayload = {
    default_level: input.default_level,
    daily_question_count: input.daily_question_count,
  };

  return toGrammarSettings(await grammarRepository.updateSettings(payload));
};

export const createSession = async (input: CreateGrammarSessionRequest): Promise<GrammarSession> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const sequenceRow = await grammarRepository.getNextSequence(trx, date.key, date.segment);
    const code = formatPublicCode('GR', date.segment, sequenceRow.sequence + 1);
    const payload = toCreateGrammarSessionPayload(input);
    const sessionId = await grammarRepository.insertSession(trx, code, payload);
    await grammarRepository.insertQuestions(trx, sessionId.id, payload.questions);
    const sessionRow = await grammarRepository.getSessionForUpdate(trx, code);

    if (sessionRow === null) {
      throw new Error('Grammar session creation did not return a session.');
    }

    const questionRows = await grammarRepository.getQuestionsInTransaction(trx, sessionRow.id);
    const session = toGrammarSession(sessionRow, questionRows);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return session;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const listSessions = async (input: ListGrammarSessionsRequest): Promise<GrammarSessionList> => {
  const query: ListGrammarSessionsQuery = {
    q: input.q,
    status: input.status,
    mode: input.mode,
    level: input.level,
    page: input.page,
    limit: input.limit,
    sort: input.sort,
  };
  const [rows, count] = await Promise.all([
    grammarRepository.listSessions(query),
    grammarRepository.countSessions(query),
  ]);

  return toGrammarSessionList(rows, count.total, input.page, input.limit);
};

export const getSession = async (code: string): Promise<GrammarSession> => {
  const sessionRow = await grammarRepository.findSessionRow(code);

  if (sessionRow === null) {
    throw sessionNotFound();
  }

  const questionRows = await grammarRepository.getQuestions(sessionRow.id);
  return toGrammarSession(sessionRow, questionRows);
};

export const removeSession = async (code: string): Promise<void> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const deleted = await grammarRepository.softDeleteSession(trx, code);

    if (!deleted) {
      throw sessionNotFound();
    }

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const saveAnswer = async (
  code: string,
  question_number: number,
  input: SaveGrammarAnswerRequest,
): Promise<GrammarSession> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const sessionRow = await getSessionForUpdate(trx, code);
    const questionRows = await grammarRepository.getQuestionsInTransaction(trx, sessionRow.id);
    const session = toGrammarSession(sessionRow, questionRows);

    if (session.status !== 'active') {
      throw inactiveSession();
    }

    if (session.mode === 'practice' && input.result === undefined) {
      throw practiceEvaluationRequired();
    }

    if (session.mode === 'exam' && input.result !== undefined) {
      throw examEvaluationDeferred();
    }

    const payload: SaveGrammarAnswerPayload = {
      user_answer: input.user_answer,
      result: input.result,
      feedback: input.feedback,
    };
    const saved = await grammarRepository.upsertAnswer(trx, code, question_number, payload);

    if (!saved) {
      throw questionNotFound();
    }

    const updatedQuestions = await grammarRepository.getQuestionsInTransaction(trx, sessionRow.id);
    const updatedSession = toGrammarSession(sessionRow, updatedQuestions);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return updatedSession;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getExplanation = async (code: string, question_number: number): Promise<GrammarExplanation> => {
  const explanationRow = await grammarRepository.getExplanation(code, question_number);

  if (explanationRow === null) {
    throw questionNotFound();
  }

  return toGrammarExplanation(explanationRow);
};

export const evaluateSession = async (code: string, input: EvaluateGrammarSessionRequest): Promise<GrammarReport> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const sessionRow = await getSessionForUpdate(trx, code);
    const questionRows = await grammarRepository.getQuestionsInTransaction(trx, sessionRow.id);
    const session = toGrammarSession(sessionRow, questionRows);

    if (session.mode !== 'exam') {
      throw examSessionRequired();
    }

    if (session.status !== 'active') {
      throw inactiveSession();
    }

    validateEvaluation(session, input);
    const payload: EvaluateGrammarSessionPayload = {
      answers: input.answers.map((answer) => ({
        question_number: answer.question_number,
        result: answer.result,
        feedback: answer.feedback ?? null,
      })),
    };
    await grammarRepository.saveEvaluation(trx, code, payload);
    const score = input.answers.filter((answer) => answer.result === 'correct').length;
    await grammarRepository.completeSession(trx, code, score, session.question_count);
    const reportRows = await grammarRepository.getReportInTransaction(trx, code);
    const report = toGrammarReport(reportRows);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return report;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getReport = async (code: string): Promise<GrammarReport> => {
  const sessionRow = await grammarRepository.findSessionRow(code);

  if (sessionRow === null) {
    throw sessionNotFound();
  }

  const reportRows = await grammarRepository.getReport(code);
  return toGrammarReport(reportRows);
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const toCreateGrammarSessionPayload = (input: CreateGrammarSessionRequest): CreateGrammarSessionPayload => ({
  mode: input.mode,
  source: input.source,
  level: input.level,
  questions: input.questions.map((question, index) => ({
    question_number: index + 1,
    question_type: question.question_type,
    grammar_area: question.grammar_area,
    grammar_point: question.grammar_point,
    level: question.level,
    question_text: question.question_text,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
  })),
});

const validateEvaluation = (session: GrammarSession, input: EvaluateGrammarSessionRequest): void => {
  const questionNumbers = new Set(input.answers.map((answer) => answer.question_number));
  const expectedQuestionNumbers = new Set(session.questions.map((question) => question.question_number));

  if (
    questionNumbers.size !== session.question_count ||
    [...expectedQuestionNumbers].some((question_number) => !questionNumbers.has(question_number))
  ) {
    throw incompleteEvaluation();
  }

  if (session.questions.some((question) => question.answer === null)) {
    throw unansweredQuestions();
  }
};

const getSessionForUpdate = async (trx: DatabaseReservedConnection, code: string): Promise<GrammarSessionRow> => {
  const session = await grammarRepository.getSessionForUpdate(trx, code);

  if (session === null) {
    throw sessionNotFound();
  }

  return session;
};

const toGrammarSettings = (row: {
  default_level: string;
  daily_question_count: number;
  updated_at: Date | string;
}): GrammarSettings => ({
  default_level: row.default_level,
  daily_question_count: row.daily_question_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const toGrammarQuestion = (row: GrammarQuestionRow): GrammarQuestion => ({
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

const toGrammarSession = (row: GrammarSessionRow, questionRows: GrammarQuestionRow[]): GrammarSession => ({
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
  questions: questionRows.map(toGrammarQuestion),
});

const toGrammarSessionListItem = (row: GrammarSessionListRow): GrammarSessionListItem => ({
  code: row.code,
  mode: row.mode,
  source: row.source,
  status: row.status,
  level: row.level,
  grammar_area: row.grammar_area,
  grammar_point: row.grammar_point,
  question_count: Number(row.question_count),
  answered_question_count: Number(row.answered_question_count),
  score: row.score === null ? null : Number(row.score),
  max_score: row.max_score === null ? null : Number(row.max_score),
  started_at: toIsoTimestamp(row.started_at),
  completed_at: row.completed_at === null ? null : toIsoTimestamp(row.completed_at),
});

const toGrammarSessionList = (
  rows: GrammarSessionListRow[],
  totalValue: number | string,
  page: number,
  limit: number,
): GrammarSessionList => {
  const total = Number(totalValue);

  return {
    items: rows.map(toGrammarSessionListItem),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const toGrammarExplanation = (row: GrammarExplanationRow): GrammarExplanation => ({
  question_number: row.question_number,
  question_text: row.question_text,
  grammar_area: row.grammar_area,
  grammar_point: row.grammar_point,
  explanation: row.explanation,
});

const toGrammarReport = (rows: GrammarReportRow[]): GrammarReport => {
  const first = rows[0];

  if (first === undefined) {
    throw sessionNotFound();
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

const sessionNotFound = (): AppError => {
  return notFoundError('GRAMMAR_SESSION_NOT_FOUND', 'Grammar session not found');
};

const questionNotFound = (): AppError => {
  return notFoundError('GRAMMAR_QUESTION_NOT_FOUND', 'Grammar question not found');
};

const inactiveSession = (): AppError => {
  return new AppError({ code: 'GRAMMAR_SESSION_INACTIVE', statusCode: 409, message: 'Grammar session is not active' });
};

const practiceEvaluationRequired = (): AppError => {
  return new AppError({
    code: 'PRACTICE_EVALUATION_REQUIRED',
    statusCode: 400,
    message: 'Practice answers require an evaluation result',
  });
};

const examEvaluationDeferred = (): AppError => {
  return new AppError({
    code: 'EXAM_EVALUATION_DEFERRED',
    statusCode: 400,
    message: 'Exam answers must be evaluated through the session evaluation endpoint',
  });
};

const examSessionRequired = (): AppError => {
  return new AppError({ code: 'EXAM_SESSION_REQUIRED', statusCode: 400, message: 'Grammar session is not an exam' });
};

const incompleteEvaluation = (): AppError => {
  return new AppError({
    code: 'INCOMPLETE_EXAM_EVALUATION',
    statusCode: 400,
    message: 'Exam evaluation must include every question exactly once',
  });
};

const unansweredQuestions = (): AppError => {
  return new AppError({
    code: 'EXAM_ANSWERS_INCOMPLETE',
    statusCode: 409,
    message: 'Every exam question must have an answer before evaluation',
  });
};
