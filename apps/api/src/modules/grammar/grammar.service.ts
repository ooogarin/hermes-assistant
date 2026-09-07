import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import * as grammarRepository from './grammar.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateGrammarSessionRequest,
  EvaluateGrammarSessionRequest,
  GrammarExplanation,
  GrammarReport,
  GrammarSession,
  GrammarSettings,
  SaveGrammarAnswerRequest,
  UpdateGrammarSettingsRequest,
} from './grammar.types';

export const getSettings = (): Promise<GrammarSettings> => grammarRepository.getSettings();

export const updateSettings = (input: UpdateGrammarSettingsRequest): Promise<GrammarSettings> => {
  return grammarRepository.updateSettings(input);
};

export const createSession = async (input: CreateGrammarSessionRequest): Promise<GrammarSession> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const code = await grammarRepository.generateCode(trx, date.key, date.segment);
    await grammarRepository.insertSession(trx, code, input);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getSession(code);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getSession = async (code: string): Promise<GrammarSession> => {
  const session = await grammarRepository.getSession(code);

  if (session === null) {
    throw sessionNotFound();
  }

  return session;
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
  const session = await getSession(code);

  if (session.status !== 'active') {
    throw inactiveSession();
  }

  if (session.mode === 'practice' && input.result === undefined) {
    throw practiceEvaluationRequired();
  }

  if (session.mode === 'exam' && input.result !== undefined) {
    throw examEvaluationDeferred();
  }

  const saved = await grammarRepository.upsertAnswer(code, question_number, input);

  if (!saved) {
    throw questionNotFound();
  }

  return getSession(code);
};

export const getExplanation = async (code: string, question_number: number): Promise<GrammarExplanation> => {
  const explanation = await grammarRepository.getExplanation(code, question_number);

  if (explanation === null) {
    throw questionNotFound();
  }

  return explanation;
};

export const evaluateSession = async (code: string, input: EvaluateGrammarSessionRequest): Promise<GrammarReport> => {
  const session = await getSession(code);

  if (session.mode !== 'exam') {
    throw examSessionRequired();
  }

  if (session.status !== 'active') {
    throw inactiveSession();
  }

  validateEvaluation(session, input);
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    await grammarRepository.saveEvaluation(trx, code, input);
    const score = input.answers.filter((answer) => answer.result === 'correct').length;
    await grammarRepository.completeSession(trx, code, score, session.question_count);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getReport(code);
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
  const report = await grammarRepository.getReport(code);

  if (report === null) {
    throw sessionNotFound();
  }

  return report;
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

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

const sessionNotFound = (): AppError => {
  return new AppError({ code: 'GRAMMAR_SESSION_NOT_FOUND', statusCode: 404, message: 'Grammar session not found' });
};

const questionNotFound = (): AppError => {
  return new AppError({ code: 'GRAMMAR_QUESTION_NOT_FOUND', statusCode: 404, message: 'Grammar question not found' });
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
