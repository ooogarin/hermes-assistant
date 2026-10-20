import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as readingRepository from './reading.repository';
import * as readingSettingService from './reading-setting/reading-setting.service';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateReadingMaterialRequest,
  InsertReadingMaterialPayload,
  InsertReadingQuestionPayload,
  ListReadingMaterialsRequest,
  ReadingExpectedAnswer,
  ReadingExpectedAnswerRow,
  ReadingMaterial,
  ReadingMaterialList,
  ReadingMaterialListItem,
  ReadingMaterialListRow,
  ReadingMaterialReferenceRequest,
  ReadingMaterialRow,
  ReadingQuestion,
  ReadingQuestionWithAnswerRow,
  SaveReadingAnswersRequest,
  UpdateReadingMaterialRequest,
} from './reading.types';

export const createMaterial = async (input: CreateReadingMaterialRequest): Promise<ReadingMaterial> => {
  const settings = await readingSettingService.getSettings();

  const material = {
    title: input.title,
    content_text: input.content_text,
    genre: input.genre,
    tags: input.tags,
    source: input.source,
    level: input.level ?? settings.default_level,
    target_word_count: input.target_word_count ?? settings.default_word_count,
    target_question_count: input.target_question_count ?? settings.default_question_count,
  };
  const questionPayloads: InsertReadingQuestionPayload[] = input.questions.map((question, index) => ({
    ...question,
    question_number: index + 1,
  }));

  if (questionPayloads.length !== material.target_question_count) {
    throw new AppError({
      code: 'READING_QUESTION_COUNT_MISMATCH',
      statusCode: 400,
      message: 'Question content must match the effective question count',
    });
  }

  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const sequenceRow = await readingRepository.getLastSequenceByDateForUpdate(date.key, date.segment, trx);

    const code = formatPublicCode('RD', date.segment, sequenceRow.sequence + 1);
    const is_override =
      material.level !== settings.default_level ||
      material.target_word_count !== settings.default_word_count ||
      material.target_question_count !== settings.default_question_count;

    const payload: InsertReadingMaterialPayload = {
      code,
      title: material.title,
      level: material.level,
      genre: material.genre,
      tags: material.tags,
      target_word_count: material.target_word_count,
      target_question_count: material.target_question_count,
      word_count: countWords(input.content_text),
      content_text: material.content_text,
      is_override,
      source: material.source,
    };

    const materialId = await readingRepository.insert(payload, trx);

    await readingRepository.bulkInsertQuestions(materialId.id, questionPayloads, trx);

    const materialRow = await readingRepository.getOneByCode(code, trx);

    if (materialRow === null) {
      throw new AppError({
        code: 'READING_MATERIAL_NOT_FOUND',
        statusCode: 500,
        message: 'Reading material creation did not return a material',
      });
    }

    const storedQuestions = await readingRepository.getAllQuestionsByMaterialId(materialRow.id, trx);

    const createdMaterial = toReadingMaterial(materialRow, storedQuestions);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return createdMaterial;
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
  const rows = await readingRepository.getAll(input);

  return { items: rows.map(toReadingMaterialListItem) };
};

export const updateMaterial = async (
  reference: ReadingMaterialReferenceRequest,
  input: UpdateReadingMaterialRequest,
): Promise<ReadingMaterial> => {
  const { code } = reference;
  const updated = await readingRepository.updateOneStatusByCode(code, input.reading_status);

  if (updated === null) {
    throw materialNotFound();
  }

  return getMaterial(reference);
};

export const getMaterial = async (reference: ReadingMaterialReferenceRequest): Promise<ReadingMaterial> => {
  const { code } = reference;
  const materialRow = await readingRepository.getOneByCode(code);

  if (materialRow === null) {
    throw materialNotFound();
  }

  const questions = await readingRepository.getAllQuestionsByMaterialId(materialRow.id);

  return toReadingMaterial(materialRow, questions);
};

export const saveAnswers = async (
  reference: ReadingMaterialReferenceRequest,
  input: SaveReadingAnswersRequest,
): Promise<ReadingMaterial> => {
  const { code } = reference;
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const row = await readingRepository.getOneIdByCodeForUpdate(code, trx);

    if (row === null) {
      throw materialNotFound();
    }

    const questions = await readingRepository.getAllQuestionsByMaterialId(row.id, trx);

    const questionNumbers = new Set(questions.map((question) => question.question_number));
    const answerNumbers = new Set(input.answers.map((answer) => answer.question_number));

    const hasDuplicateQuestionNumbers = answerNumbers.size !== input.answers.length;
    const hasUnknownQuestionNumbers = input.answers.some((answer) => !questionNumbers.has(answer.question_number));

    if (hasDuplicateQuestionNumbers || hasUnknownQuestionNumbers) {
      throw new AppError({
        code: 'INVALID_READING_ANSWERS',
        statusCode: 400,
        message: 'Answers must reference unique questions belonging to this material',
      });
    }

    const answers = input.answers.flatMap((answer) =>
      answer.user_answer === null
        ? []
        : [
            {
              question_number: answer.question_number,
              user_answer: answer.user_answer,
            },
          ],
    );

    if (answers.length > 0) {
      const submission = await readingRepository.upsertOneSubmissionByMaterialId(row.id, trx);

      await readingRepository.upsertAllAnswersByMaterialId(row.id, submission.id, { answers }, trx);
    }

    const cleared = input.answers
      .filter((answer) => answer.user_answer === null)
      .map((answer) => answer.question_number);

    if (cleared.length > 0) {
      await readingRepository.softDeleteAllAnswersByMaterialIdAndQuestionNumbers(row.id, cleared, trx);
    }

    const materialRow = await readingRepository.getOneByCode(code, trx);

    if (materialRow === null) {
      throw materialNotFound();
    }

    const updatedQuestions = await readingRepository.getAllQuestionsByMaterialId(row.id, trx);

    const material = toReadingMaterial(materialRow, updatedQuestions);
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

export const getExpectedAnswers = async (
  reference: ReadingMaterialReferenceRequest,
): Promise<ReadingExpectedAnswer[]> => {
  const { code } = reference;

  await getMaterial(reference);

  const rows = await readingRepository.getAllExpectedAnswersByCode(code);

  return rows.map(toReadingExpectedAnswer);
};

// ==========[ Helper functions ]==========================================================================================

const toReadingQuestion = (row: ReadingQuestionWithAnswerRow): ReadingQuestion => ({
  question_number: row.question_number,
  question_text: row.question_text,
  user_answer: row.user_answer,
});

const toReadingMaterial = (row: ReadingMaterialRow, questions: ReadingQuestionWithAnswerRow[]): ReadingMaterial => ({
  code: row.code,
  title: row.title,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  word_count: row.word_count,
  content_text: row.content_text,
  reading_status: row.reading_status,
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
  is_override: row.is_override,
  source: row.source,
  questions: questions.map(toReadingQuestion),
});

const toReadingMaterialListItem = (row: ReadingMaterialListRow): ReadingMaterialListItem => ({
  code: row.code,
  title: row.title,
  content_excerpt: row.content_excerpt,
  genre: row.genre,
  level: row.level,
  tags: row.tags,
  reading_status: row.reading_status,
  created_at: toIsoTimestamp(row.created_at),
});

const toReadingExpectedAnswer = (row: ReadingExpectedAnswerRow): ReadingExpectedAnswer => ({
  question_number: row.question_number,
  question_text: row.question_text,
  expected_answer: row.expected_answer,
});

const materialNotFound = (): AppError => {
  return notFoundError('READING_MATERIAL_NOT_FOUND', 'Reading material not found');
};
