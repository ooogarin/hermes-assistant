import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as readingRepository from './reading.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateReadingMaterialPayload,
  CreateReadingMaterialRequest,
  ListReadingMaterialsQuery,
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
  SaveReadingSubmissionPayload,
  SaveReadingSubmissionRequest,
  UpdateReadingSettingsPayload,
  UpdateReadingSettingsRequest,
} from './reading.types';

export const getSettings = async (): Promise<ReadingSettings> => {
  return toReadingSettings(await readingRepository.getSettings());
};

export const updateSettings = async (input: UpdateReadingSettingsRequest): Promise<ReadingSettings> => {
  const currentSettings = await getSettings();
  const min_word_count = input.min_word_count ?? currentSettings.min_word_count;
  const max_word_count = input.max_word_count ?? currentSettings.max_word_count;
  const default_word_count = input.default_word_count ?? currentSettings.default_word_count;
  if (min_word_count > max_word_count || default_word_count < min_word_count || default_word_count > max_word_count) {
    throw invalidSettings();
  }

  const payload: UpdateReadingSettingsPayload = {
    default_level: input.default_level,
    default_word_count: input.default_word_count,
    min_word_count: input.min_word_count,
    max_word_count: input.max_word_count,
  };

  return toReadingSettings(await readingRepository.updateSettings(payload));
};

export const createMaterial = async (input: CreateReadingMaterialRequest): Promise<ReadingMaterial> => {
  const settings = await getSettings();
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const sequenceRow = await readingRepository.getNextSequence(trx, date.key, date.segment);
    const code = formatPublicCode('RD', date.segment, sequenceRow.sequence + 1);
    const is_override =
      input.level !== settings.default_level || input.target_word_count !== settings.default_word_count;
    const payload = toCreateReadingMaterialPayload(input);

    const materialId = await readingRepository.insertMaterial(
      trx,
      code,
      payload,
      countWords(input.passage_text),
      is_override,
    );
    await readingRepository.insertQuestions(trx, materialId.id, payload.questions);
    const materialRow = await readingRepository.findByCodeInTransaction(trx, code);

    if (materialRow === null) {
      throw new Error('Reading material creation did not return a material.');
    }

    const questions = await readingRepository.getQuestionsInTransaction(trx, materialRow.id);
    const material = toReadingMaterial(materialRow, questions);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return material;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const listMaterials = async (input: ListReadingMaterialsRequest): Promise<ReadingMaterialList> => {
  const query: ListReadingMaterialsQuery = {
    q: input.q,
    status: input.status,
    levels: 'levels' in input ? input.levels : undefined,
    genre: input.genre,
    page: input.page,
    limit: input.limit,
    sort: input.sort,
  };
  const [rows, count] = await Promise.all([
    readingRepository.listMaterials(query),
    readingRepository.countMaterials(query),
  ]);

  return toReadingMaterialList(rows, count.total, input.page, input.limit);
};

export const getMaterial = async (code: string): Promise<ReadingMaterial> => {
  const materialRow = await readingRepository.findByCode(code);

  if (materialRow === null) {
    throw materialNotFound();
  }

  const questions = await readingRepository.getQuestions(materialRow.id);
  return toReadingMaterial(materialRow, questions);
};

export const saveSubmission = async (code: string, input: SaveReadingSubmissionRequest): Promise<ReadingMaterial> => {
  const material = await getMaterial(code);

  validateSubmission(material, input);

  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const payload: SaveReadingSubmissionPayload = {
      answers: input.answers.map((answer) => ({
        question_number: answer.question_number,
        user_answer: answer.user_answer,
      })),
    };
    const submission = await readingRepository.insertSubmission(trx, code);

    if (submission === null) {
      const materialRow = await readingRepository.findByCodeInTransaction(trx, code);

      if (materialRow === null) {
        throw materialNotFound();
      }

      throw submissionAlreadyExists();
    }

    await readingRepository.insertAnswers(trx, code, submission.id, payload);

    const materialRow = await readingRepository.findByCodeInTransaction(trx, code);

    if (materialRow === null) {
      throw materialNotFound();
    }

    const questions = await readingRepository.getQuestionsInTransaction(trx, materialRow.id);
    const material = toReadingMaterial(materialRow, questions);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return material;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getExpectedAnswers = async (code: string): Promise<ReadingExpectedAnswer[]> => {
  await getMaterial(code);

  const rows = await readingRepository.getExpectedAnswers(code);
  return rows.map(toReadingExpectedAnswer);
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const toReadingSettings = (row: ReadingSettingsRow): ReadingSettings => ({
  default_level: row.default_level,
  default_word_count: row.default_word_count,
  min_word_count: row.min_word_count,
  max_word_count: row.max_word_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const toCreateReadingMaterialPayload = (input: CreateReadingMaterialRequest): CreateReadingMaterialPayload => ({
  topic: input.topic,
  level: input.level,
  genre: input.genre,
  tags: input.tags,
  target_word_count: input.target_word_count,
  passage_text: input.passage_text,
  source: input.source,
  questions: input.questions.map((question, index) => ({
    question_number: index + 1,
    question_text: question.question_text,
    expected_answer: question.expected_answer,
  })),
});

const toReadingQuestion = (row: ReadingQuestionWithAnswerRow): ReadingQuestion => ({
  question_number: row.question_number,
  question_text: row.question_text,
  user_answer: row.user_answer,
});

const toReadingMaterial = (row: ReadingMaterialRow, questions: ReadingQuestionWithAnswerRow[]): ReadingMaterial => ({
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
  questions: questions.map(toReadingQuestion),
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
  status: row.is_completed ? 'completed' : 'unanswered',
  question_count: Number(row.question_count),
  answered_question_count: Number(row.answered_question_count),
  created_at: toIsoTimestamp(row.created_at),
});

const toReadingMaterialList = (
  rows: ReadingMaterialListRow[],
  totalValue: number | string,
  page: number,
  limit: number,
): ReadingMaterialList => {
  const total = Number(totalValue);

  return {
    items: rows.map(toReadingMaterialListItem),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const toReadingExpectedAnswer = (row: ReadingExpectedAnswerRow): ReadingExpectedAnswer => ({
  question_number: row.question_number,
  question_text: row.question_text,
  expected_answer: row.expected_answer,
});

const validateSubmission = (material: ReadingMaterial, input: SaveReadingSubmissionRequest): void => {
  const actual = new Set(input.answers.map((answer) => answer.question_number));
  const expected = new Set(material.questions.map((question) => question.question_number));

  if (
    actual.size !== material.questions.length ||
    [...expected].some((question_number) => !actual.has(question_number))
  ) {
    throw new AppError({
      code: 'INCOMPLETE_READING_SUBMISSION',
      statusCode: 400,
      message: 'Reading submission must include every question exactly once',
    });
  }
};

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};

const materialNotFound = (): AppError => {
  return notFoundError('READING_MATERIAL_NOT_FOUND', 'Reading material not found');
};

const submissionAlreadyExists = (): AppError => {
  return new AppError({
    code: 'READING_SUBMISSION_ALREADY_EXISTS',
    statusCode: 409,
    message: 'Reading material already has a submission',
  });
};
