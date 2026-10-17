import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import * as grammarRepository from './grammar.repository';
import * as grammarQuestionRepository from './grammar-question/grammar-question.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionPayload,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarExplanationRow,
  GrammarReport,
  GrammarReportRow,
  GrammarSession,
  GrammarSessionList,
  GrammarSessionListItem,
  GrammarSessionListRow,
  GrammarSessionRow,
  InsertGrammarSessionPayload,
  ListGrammarSessionsQuery,
  ListGrammarSessionsRequest,
  SaveAnswersPayload,
  SaveAnswersRequest,
} from './grammar.types';
import type {
  GrammarQuestion,
  GrammarQuestionRow,
  InsertGrammarQuestionPayload,
} from './grammar-question/grammar-question.types';

const GRAMMAR_CODE_PREFIX = 'GR';

export const createSession = async (input: CreateGrammarSessionRequest): Promise<GrammarSession> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const sequenceRow = await grammarRepository.getLastSequenceByDateForUpdate(GRAMMAR_CODE_PREFIX, date, trx);

    const code = formatPublicCode(GRAMMAR_CODE_PREFIX, date.segment, sequenceRow.sequence + 1);
    const grammarSessionPayload = toInsertGrammarSessionPayload(input, code);
    const grammarQuestionPayloads = toInsertGrammarQuestionPayloads(input);

    const sessionRow = await grammarRepository.insert(grammarSessionPayload, trx);

    await grammarQuestionRepository.bulkInsert(sessionRow.id, grammarQuestionPayloads, trx);

    const questions = grammarQuestionPayloads.map(toNewGrammarQuestion);
    const session = toGrammarSession(sessionRow, questions);
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
    limit: input.limit,
    sort: input.sort,
  };

  const rows = await grammarRepository.getAll(query);

  return toGrammarSessionList(rows);
};

export const getSession = async (code: string): Promise<GrammarSession> => {
  const sessionRow = await grammarRepository.getOneByCode(code);

  if (sessionRow === null) {
    throw sessionNotFound();
  }

  const questionRows = await grammarQuestionRepository.getAllBySessionId(sessionRow.id);
  const questions = questionRows.map(toGrammarQuestion);

  return toGrammarSession(sessionRow, questions);
};

export const removeSession = async (code: string): Promise<void> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const deleted = await grammarRepository.softDeleteOneByCode(code, trx);

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

export const saveAnswers = async (code: string, input: SaveAnswersRequest): Promise<GrammarSession> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const sessionRow = await getSessionForUpdate(code, trx);
    const questionRows = await grammarQuestionRepository.getAllBySessionId(sessionRow.id, trx);
    const questions = questionRows.map(toGrammarQuestion);

    const session = toGrammarSession(sessionRow, questions);

    if (session.status !== 'active') {
      throw inactiveSession();
    }

    const hasMissingPracticeEvaluation =
      session.mode === 'practice' && input.answers.some((answer) => answer.result === undefined);

    if (hasMissingPracticeEvaluation) {
      throw practiceEvaluationRequired();
    }

    const hasPrematureExamEvaluation =
      session.mode === 'exam' && input.answers.some((answer) => answer.result !== undefined);

    if (hasPrematureExamEvaluation) {
      throw examEvaluationDeferred();
    }

    const questionNumbers = new Set(questionRows.map((questionRow) => questionRow.question_number));
    const answerNumbers = new Set(input.answers.map((answer) => answer.question_number));

    const hasDuplicateQuestionNumbers = answerNumbers.size !== input.answers.length;
    const hasUnknownQuestionNumbers = input.answers.some((answer) => !questionNumbers.has(answer.question_number));

    if (hasDuplicateQuestionNumbers || hasUnknownQuestionNumbers) {
      throw invalidAnswers();
    }

    const payload: SaveAnswersPayload = {
      answers: input.answers.map((answer) => ({
        question_number: answer.question_number,
        user_answer: answer.user_answer,
        result: answer.result ?? null,
        feedback: answer.feedback ?? null,
      })),
    };

    await grammarRepository.upsertAllAnswersByCodeAndQuestionNumbers(code, payload, trx);

    const updatedQuestionRows = await grammarQuestionRepository.getAllBySessionId(sessionRow.id, trx);
    const updatedQuestions = updatedQuestionRows.map(toGrammarQuestion);

    // A practice session completes itself as soon as its last open question has been answered.
    if (session.mode === 'practice') {
      const hasEveryQuestionAnswered = updatedQuestions.every((question) => question.answer !== null);

      if (hasEveryQuestionAnswered) {
        const score = updatedQuestions.filter((question) => question.answer?.result === 'correct').length;

        await grammarRepository.updateOneCompletionByCode(code, score, session.question_count, trx);
      }
    }

    const savedSessionRow = await grammarRepository.getOneByCode(code, trx);

    if (savedSessionRow === null) {
      throw sessionNotFound();
    }

    const updatedSession = toGrammarSession(savedSessionRow, updatedQuestions);

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
  const explanationRow = await grammarRepository.getOneExplanationByCodeAndQuestionNumber(code, question_number);

  if (explanationRow === null) {
    throw questionNotFound();
  }

  return toGrammarExplanation(explanationRow);
};

export const evaluateSession = async (code: string, input: EvaluateGrammarSessionRequest): Promise<GrammarReport> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const sessionRow = await getSessionForUpdate(code, trx);
    const questionRows = await grammarQuestionRepository.getAllBySessionId(sessionRow.id, trx);
    const questions = questionRows.map(toGrammarQuestion);

    const session = toGrammarSession(sessionRow, questions);

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

    await grammarRepository.updateAllAnswerEvaluationsByCode(code, payload, trx);

    const score = input.answers.filter((answer) => answer.result === 'correct').length;

    await grammarRepository.updateOneCompletionByCode(code, score, session.question_count, trx);

    const reportRows = await grammarRepository.getAllReportRowsByCode(code, trx);

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
  const sessionRow = await grammarRepository.getOneByCode(code);

  if (sessionRow === null) {
    throw sessionNotFound();
  }

  const reportRows = await grammarRepository.getAllReportRowsByCode(code);

  return toGrammarReport(reportRows);
};

// ==========[ Helper functions ]==========================================================================================

const toInsertGrammarSessionPayload = (
  input: CreateGrammarSessionRequest,
  code: string,
): InsertGrammarSessionPayload => ({
  code,
  mode: input.mode,
  source: input.source,
  level: input.level,
  question_count: input.questions.length,
});

const toInsertGrammarQuestionPayloads = (input: CreateGrammarSessionRequest): InsertGrammarQuestionPayload[] =>
  input.questions.map((question, index) => ({
    question_number: index + 1,
    question_type: question.question_type,
    grammar_area: question.grammar_area,
    grammar_point: question.grammar_point,
    level: question.level,
    question_text: question.question_text,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
  }));

const validateEvaluation = (session: GrammarSession, input: EvaluateGrammarSessionRequest): void => {
  const questionNumbers = new Set(input.answers.map((answer) => answer.question_number));
  const expectedQuestionNumbers = new Set(session.questions.map((question) => question.question_number));

  const hasWrongQuestionCount = questionNumbers.size !== session.question_count;
  const hasMissingQuestionNumbers = [...expectedQuestionNumbers].some(
    (question_number) => !questionNumbers.has(question_number),
  );

  if (hasWrongQuestionCount || hasMissingQuestionNumbers) {
    throw incompleteEvaluation();
  }

  const hasUnansweredQuestions = session.questions.some((question) => question.answer === null);

  if (hasUnansweredQuestions) {
    throw unansweredQuestions();
  }
};

const getSessionForUpdate = async (code: string, trx: DatabaseReservedConnection): Promise<GrammarSessionRow> => {
  const session = await grammarRepository.getOneByCodeForUpdate(code, trx);

  if (session === null) {
    throw sessionNotFound();
  }

  return session;
};

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

const toNewGrammarQuestion = (question: InsertGrammarQuestionPayload): GrammarQuestion => ({
  question_number: question.question_number,
  question_type: question.question_type,
  grammar_area: question.grammar_area,
  grammar_point: question.grammar_point,
  level: question.level,
  question_text: question.question_text,
  answer: null,
});

const toGrammarSession = (row: GrammarSessionRow, questions: GrammarQuestion[]): GrammarSession => ({
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

const toGrammarSessionListItem = (row: GrammarSessionListRow): GrammarSessionListItem => ({
  code: row.code,
  mode: row.mode,
  source: row.source,
  status: row.status,
  level: row.level,
  question_count: Number(row.question_count),
  score: row.score === null ? null : Number(row.score),
  max_score: row.max_score === null ? null : Number(row.max_score),
  started_at: toIsoTimestamp(row.started_at),
  completed_at: row.completed_at === null ? null : toIsoTimestamp(row.completed_at),
});

const toGrammarSessionList = (rows: GrammarSessionListRow[]): GrammarSessionList => ({
  items: rows.map(toGrammarSessionListItem),
});

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

const invalidAnswers = (): AppError => {
  return new AppError({
    code: 'INVALID_GRAMMAR_ANSWERS',
    statusCode: 400,
    message: 'Answers must reference unique questions belonging to this session',
  });
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
