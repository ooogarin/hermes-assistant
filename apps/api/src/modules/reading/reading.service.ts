import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as readingRepository from './reading.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateReadingMaterialRequest,
  ReadingExpectedAnswer,
  ReadingMaterial,
  ReadingSettings,
  SaveReadingSubmissionRequest,
  UpdateReadingSettingsRequest,
} from './reading.types';

export const getSettings = (): Promise<ReadingSettings> => readingRepository.getSettings();

export const updateSettings = async (input: UpdateReadingSettingsRequest): Promise<ReadingSettings> => {
  const currentSettings = await getSettings();
  const minWordCount = input.minWordCount ?? currentSettings.minWordCount;
  const maxWordCount = input.maxWordCount ?? currentSettings.maxWordCount;
  const defaultWordCount = input.defaultWordCount ?? currentSettings.defaultWordCount;
  if (minWordCount > maxWordCount || defaultWordCount < minWordCount || defaultWordCount > maxWordCount) {
    throw invalidSettings();
  }

  return readingRepository.updateSettings(input);
};

export const createMaterial = async (input: CreateReadingMaterialRequest): Promise<ReadingMaterial> => {
  const settings = await getSettings();
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const code = await readingRepository.generateCode(trx, date.key, date.segment);
    const isOverride = input.level !== settings.defaultLevel || input.targetWordCount !== settings.defaultWordCount;

    await readingRepository.insertMaterial(trx, code, input, countWords(input.passageText), isOverride);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getMaterial(code);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getMaterial = async (code: string): Promise<ReadingMaterial> => {
  const material = await readingRepository.findByCode(code);

  if (material === null) {
    throw materialNotFound();
  }

  return material;
};

export const saveSubmission = async (code: string, input: SaveReadingSubmissionRequest): Promise<ReadingMaterial> => {
  const material = await getMaterial(code);

  validateSubmission(material, input);

  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const result = await readingRepository.insertSubmission(trx, code, input);

    if (result === 'material_not_found') {
      throw materialNotFound();
    }

    if (result === 'already_submitted') {
      throw submissionAlreadyExists();
    }

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getMaterial(code);
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

  return readingRepository.getExpectedAnswers(code);
};

// ====================================================================================================
// Helper functions
// ====================================================================================================
const validateSubmission = (material: ReadingMaterial, input: SaveReadingSubmissionRequest): void => {
  const actual = new Set(input.answers.map((answer) => answer.questionNumber));
  const expected = new Set(material.questions.map((question) => question.questionNumber));

  if (
    actual.size !== material.questions.length ||
    [...expected].some((questionNumber) => !actual.has(questionNumber))
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
  return new AppError({
    code: 'READING_MATERIAL_NOT_FOUND',
    statusCode: 404,
    message: 'Reading material not found',
  });
};

const submissionAlreadyExists = (): AppError => {
  return new AppError({
    code: 'READING_SUBMISSION_ALREADY_EXISTS',
    statusCode: 409,
    message: 'Reading material already has a submission',
  });
};
